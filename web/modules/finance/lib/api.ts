export async function fetchFinanceJson<T = any>(path: string): Promise<T> {
  const response = await fetch(path, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Finance request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export async function postFinanceJson<T = any>(path: string, body: Record<string, any>): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Finance request failed (${response.status})`);
  }
  return (await response.json()) as T;
}
