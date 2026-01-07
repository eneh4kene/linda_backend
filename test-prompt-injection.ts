/**
 * Test prompt injection with memory layer data
 */

import { prisma } from './src/lib/prisma';
import { buildCallContext } from './src/services/contextBuilder';
import { renderSystemPrompt } from './src/services/prompt';

async function testPromptInjection() {
  console.log('🧪 Testing Prompt Injection with Memory Layer\n');

  try {
    // Find resident with memory layer data
    const resident = await prisma.resident.findFirst({
      where: {
        firstName: 'Margaret',
      },
      include: {
        pattern: true,
        callStates: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
        anticipatedEvents: {
          where: { status: 'upcoming' },
          take: 3,
        },
        callbacks: {
          where: { stillLands: true },
          take: 5,
        },
      },
    });

    if (!resident) {
      console.log('❌ No resident found for testing');
      return;
    }

    console.log(`✅ Testing with resident: ${resident.firstName} ${resident.lastName || ''}`);
    console.log(`   Has pattern: ${resident.pattern ? 'Yes' : 'No'}`);
    console.log(`   Has call states: ${resident.callStates.length > 0 ? 'Yes' : 'No'}`);
    console.log(`   Upcoming events: ${resident.anticipatedEvents.length}`);
    console.log(`   Active callbacks: ${resident.callbacks.length}`);
    console.log();

    // Build call context
    console.log('🔄 Building call context...\n');
    const context = await buildCallContext(resident.id);

    console.log('📊 Context Data:');
    console.log(`   Call number: ${context.metadata.callNumber}`);
    console.log(`   Is first call: ${context.metadata.isFirstCall}`);
    console.log(`   Memories count: ${context.metadata.memoriesCount}`);
    console.log();

    // Check if memory layer context was included
    if (context.dynamicVariables.memory_layer_context) {
      console.log('✅ Memory layer context included!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('MEMORY LAYER CONTEXT:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(context.dynamicVariables.memory_layer_context);
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      console.log('⚠️  No memory layer context found\n');
    }

    // Render full system prompt
    console.log('🔄 Rendering full system prompt...\n');
    const promptData = {
      ...context.dynamicVariables,
      mode_inbound: false,
      mode_outbound: true,
      memories: context.rawContext?.memories || [],
    };

    const systemPrompt = renderSystemPrompt(promptData);

    console.log('✅ System prompt rendered successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('FULL SYSTEM PROMPT (first 2000 chars):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(systemPrompt.substring(0, 2000));
    console.log('\n...(truncated)...\n');

    // Check if memory layer section appears in prompt
    if (systemPrompt.includes('MEMORY CONTEXT FOR')) {
      console.log('✅ Memory layer context successfully injected into prompt!\n');

      // Show where it appears
      const contextStart = systemPrompt.indexOf('MEMORY CONTEXT FOR');
      const contextEnd = systemPrompt.indexOf('---', contextStart + 100);

      if (contextEnd > contextStart) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('MEMORY SECTION IN PROMPT:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log(systemPrompt.substring(contextStart, contextEnd + 3));
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      }
    } else {
      console.log('⚠️  Memory layer context not found in rendered prompt\n');
    }

    // Show stats
    console.log('📈 Prompt Statistics:');
    console.log(`   Total length: ${systemPrompt.length} characters`);
    console.log(`   Word count: ~${Math.round(systemPrompt.split(/\s+/).length)} words`);
    console.log(`   Token estimate: ~${Math.round(systemPrompt.length / 4)} tokens`);
    console.log();

    console.log('🎉 Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPromptInjection().catch(console.error);
