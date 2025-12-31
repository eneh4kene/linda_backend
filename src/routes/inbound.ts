import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { buildCallContext } from '../services/contextBuilder';
import { renderSystemPrompt } from '../services/prompt';
import { RetellDynamicVariables } from '../types';

const router = Router();

/**
 * POST /api/inbound/retell
 * Retell Dynamic Variables Webhook
 * Triggered when an inbound call is received
 */
router.post('/retell', async (req, res) => {
    try {
        console.log('🔍 Raw Inbound Body:', JSON.stringify(req.body, null, 2));
        const { from_number, call_id } = req.body;
        console.log(`📞 Inbound call received from: ${from_number} (Call ID: ${call_id})`);

        // 1. Find resident by phone number
        const resident = await prisma.resident.findFirst({
            where: { phoneNumber: from_number },
        });

        if (!resident) {
            console.warn(`⚠️  Unknown caller: ${from_number}`);
            // Return basic variables if resident unknown
            return res.json({
                dynamic_variables: {
                    preferred_name: 'Friend',
                    full_name: 'Unknown',
                } as Partial<RetellDynamicVariables>
            });
        }

        // 2. Build Context (Inbound Mode)
        console.log(`✅ Identified resident: ${resident.firstName} ${resident.lastName}`);
        const context = await buildCallContext(resident.id);

        // 3. Create Call Record
        const call = await prisma.call.create({
            data: {
                residentId: resident.id,
                retellCallId: call_id,
                direction: 'INBOUND',
                status: 'in_progress',
                callNumber: context.metadata.callNumber,
                isFirstCall: context.metadata.isFirstCall,
                startedAt: new Date(),
                contextUsed: context.dynamicVariables as any,
            },
        });
        console.log(`✅ Created inbound call record: ${call.id}`);

        // 4. Render System Prompt using Handlebars
        // Combine rich context with mode flags
        const promptData = {
            ...context.dynamicVariables,
            mode_inbound: true,
            mode_outbound: false,
            // Pass raw memories array for template iteration
            memories: context.rawContext?.memories || [],
            last_call_summary: context.dynamicVariables.last_call_summary,
            favorite_topics: context.dynamicVariables.favorite_topics,
            recent_context: "Resident initiated this call." // Placeholder
        };

        const systemPrompt = renderSystemPrompt(promptData);

        // 5. Return response to Retell
        // We send dynamic_variables (legacy) AND override the system prompt via 'context_prompt' or 'llm_websocket_url'??? 
        // Wait, Retell's Dynamic Variables webhook documentation says:
        // "Return a JSON object with the keys being the variable names and values replacement."
        // It DOES NOT say we can override the system prompt here easily unless we use "Custom LLM".
        // BUT, if we use Retell LLM, we might be limited.
        // However, Retell recently added "override_system_prompt" in the response of this webhook?
        // Checking assumption: IF we cannot override prompt here, we are stuck.
        // Let's assume we pass the rendered prompt as a special variable `system_prompt_override` if the Agent is configured to use it?
        // OR, we hope `retell_llm_prompt` works here too?
        // Actually, for INBOUND, the call is already "created" before we get this webhook.
        // The webhook is for *fetching variables*.
        // If Retell doesn't support returning a prompt override in this webhook response, we fail.

        // ADJUSTMENT: Retell expects a flat object map of variable_name -> value.
        // We will attempt to pass the FULL system prompt as a variable named 'system_prompt'.
        // User must configure their Retell Agent prompt to be just: {{system_prompt}}

        const dynamicVariables = {
            ...context.dynamicVariables,
            system_prompt: systemPrompt,
        };

        console.log('📤 Sending to Retell:');
        console.log('  preferred_name:', dynamicVariables.preferred_name);
        console.log('  memories:', dynamicVariables.memories?.substring(0, 100) + '...');
        console.log('  last_call_summary:', dynamicVariables.last_call_summary?.substring(0, 100) + '...');
        console.log('  system_prompt length:', systemPrompt.length);

        // Retell expects inbound webhook response in this format
        return res.json({
            call_inbound: {
                dynamic_variables: dynamicVariables
            }
        });

    } catch (error) {
        console.error('Error handling inbound call:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
