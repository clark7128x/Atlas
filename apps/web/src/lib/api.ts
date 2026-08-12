const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

interface Document {
  id: string;
  title: string;
  owner_id: string;
  org_id: string;
  visibility: 'PRIVATE' | 'ORG_WIDE';
  status: string;
  created_at: string;
}

interface QuerySource {
  doc_id: string;
  chunk_text: string;
  page_num: number;
  bbox: { x1: number; y1: number; x2: number; y2: number };
}

interface QueryResponse {
  answer: string;
  sources: QuerySource[];
  meta: {
    documents_searched: number;
  };
}

function getHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Login failed (${res.status})`);
  }
  return res.json();
}

export async function register(email: string, password: string, orgName?: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, password, orgName }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Registration failed (${res.status})`);
  }
  return res.json();
}

export async function getDocuments(token: string): Promise<Document[]> {
  const res = await fetch(`${API_BASE}/documents`, {
    headers: getHeaders(token),
  });
  if (!res.ok) throw new Error(`Failed to fetch documents (${res.status})`);
  return res.json();
}

export async function createDocument(token: string, title: string, visibility: string): Promise<{ doc_id: string; status: string }> {
  const res = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ title, visibility }),
  });
  if (!res.ok) throw new Error(`Failed to create document (${res.status})`);
  return res.json();
}

export async function queryDocuments(token: string, text: string): Promise<QueryResponse> {
  const res = await fetch(`${API_BASE}/query`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Query failed (${res.status})`);
  return res.json();
}

export type { LoginResponse, Document, QuerySource, QueryResponse };
