// backend/src/services/paymentGateway.ts

export interface PaymentRequest {
  bookingId: string;
  amount: number;
  currency?: string;
  idempotencyKey?: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  amount: number;
  status: 'SUCCESS' | 'FAILED';
  timestamp: string;
  gatewayMessage: string;
}

export interface IPaymentGateway {
  charge(request: PaymentRequest): Promise<PaymentResponse>;
}

/**
 * Mock Campus Payment Gateway implementation.
 * Simulates gateway processing behind a clean interface.
 */
export class MockCampusPaymentGateway implements IPaymentGateway {
  async charge(request: PaymentRequest): Promise<PaymentResponse> {
    // In production, this would call Stripe, Razorpay, or Campus Card API
    // Simulate slight network latency
    await new Promise((resolve) => setTimeout(resolve, 50));

    return {
      success: true,
      transactionId: `mock-tx-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      amount: request.amount,
      status: 'SUCCESS',
      timestamp: new Date().toISOString(),
      gatewayMessage: 'Campus Wallet transaction approved',
    };
  }
}

export const paymentGateway: IPaymentGateway = new MockCampusPaymentGateway();
