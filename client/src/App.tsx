import { FormEvent, useEffect, useState } from 'react';

interface PaymentMethod {
  code: string;
  name: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
const DEMO_AMOUNT = 100000;

export default function App() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const result = new URLSearchParams(window.location.search);

  useEffect(() => {
    async function loadMethods() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/payments/methods`);
        const data: { methods: PaymentMethod[] } = await response.json();
        setMethods(data.methods);
        setSelectedMethod(data.methods[0]?.code ?? '');
      } catch {
        setError('Cannot load payment methods. Is the API running?');
      }
    }

    loadMethods();
  }, []);

  async function handlePay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedMethod })
      });
      const data: { paymentUrl?: string; message?: string } = await response.json();

      if (!response.ok || !data.paymentUrl) {
        throw new Error(data.message ?? 'Cannot create payment.');
      }

      window.location.href = data.paymentUrl;
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Cannot create payment.');
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">Payment API Demo</p>
        <h1>Demo Product</h1>
        <p className="price">{DEMO_AMOUNT.toLocaleString('vi-VN')} VND</p>

        {result.has('status') && (
          <div className={`result ${result.get('status') === 'paid' ? 'success' : 'failed'}`}>
            Order #{result.get('orderId')} payment status: {result.get('status')}
          </div>
        )}

        <form onSubmit={handlePay}>
          <fieldset disabled={loading || methods.length === 0}>
            <legend>Select payment method</legend>
            <div className="methods">
              {methods.map((method) => (
                <label key={method.code} className="method">
                  <input
                    type="radio"
                    name="provider"
                    value={method.code}
                    checked={selectedMethod === method.code}
                    onChange={(event) => setSelectedMethod(event.target.value)}
                  />
                  <span>{method.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading || !selectedMethod}>
            {loading ? 'Creating payment...' : 'Pay'}
          </button>
        </form>
      </section>
    </main>
  );
}
