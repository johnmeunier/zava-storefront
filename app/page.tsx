import { db } from "@/lib/db";

export default async function HomePage() {
  const products = await db.listProducts({ limit: 12 });
  return (
    <main className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Zava — Featured products</h1>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => (
          <li key={p.id} className="border rounded p-4">
            <h2 className="font-semibold">{p.name}</h2>
            <p className="text-sm text-gray-600">{p.description}</p>
            <p className="mt-2 font-mono">${(p.priceCents / 100).toFixed(2)}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
