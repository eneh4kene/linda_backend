import crypto from 'crypto';
import { env } from '../config/env';
import {
  RetellCreateCallRequest,
  RetellCreateCallResponse,
  RetellDynamicVariables,
} from '../types';

const RETELL_API_BASE = 'https://api.retellai.com/v2';

/**
 * Initiates an outbound phone call via Retell AI
 */
export async function initiateCall(params: {
  residentId: string;
  phoneNumber: string;
  dynamicVariables: RetellDynamicVariables;
  metadata: Record<string, any>;
  retell_llm_prompt?: string;
}): Promise<RetellCreateCallResponse> {
  // Use dummy phone number from env or fallback for test mode
  const isTestMode = env.RETELL_TEST_MODE === 'true';
  const fromNumber = env.RETELL_PHONE_NUMBER || (isTestMode ? '+15555550000' : '');

  if (!fromNumber) {
    throw new Error('RETELL_PHONE_NUMBER not configured and not in test mode');
  }

  const requestBody: RetellCreateCallRequest = {
    agent_id: env.RETELL_AGENT_ID,
    to_number: params.phoneNumber,
    from_number: fromNumber,
    retell_llm_dynamic_variables: params.dynamicVariables,
    metadata: {
      ...params.metadata,
      residentId: params.residentId,
      testMode: isTestMode,
    },
    retell_llm_prompt: params.retell_llm_prompt,
  };

  const response = await fetch(`${RETELL_API_BASE}/create-phone-call`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RETELL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Retell API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data as RetellCreateCallResponse;
}

/**
 * Fetches full call details from Retell API including transcript with timestamps
 */
export async function getCallDetails(retellCallId: string): Promise<any> {
  const response = await fetch(`${RETELL_API_BASE}/get-call/${retellCallId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${env.RETELL_API_KEY}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Retell API error fetching call: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Verifies the webhook signature from Retell
 * Uses HMAC SHA256 verification
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string | undefined
): boolean {
  if (!signature) {
    return false;
  }

  try {
    const hmac = crypto.createHmac('sha256', env.RETELL_WEBHOOK_SECRET);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}
