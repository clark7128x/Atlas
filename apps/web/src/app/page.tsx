"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  FileText,
  Lock,
  Globe,
  LogOut,
  LogIn,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import React, { useState, useCallback, useEffect } from "react";
import {
  login as apiLogin,
  register as apiRegister,
  getDocuments,
  createDocument,
  queryDocuments,
} from "@/lib/api";
import type { Document, QueryResponse } from "@/lib/api";

type AuthUser = { id: string; email: string; role: string };

// ─── Small display helpers ──────────────────────────────────────────────────
function authErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function pluralDocs(n: number): string {
  return n === 1 ? "document" : "documents";
}

function roleLabel(role: string): string {
  const known: Record<string, string> = {
    ADMIN: "Admin",
    USER: "User",
  };
  return known[role] ?? role;
}

function statusLabel(status: string): string {
  const known: Record<string, string> = {
    PENDING: "Processing",
    READY: "Ready",
    FAILED: "Failed",
  };
  return known[status] ?? status;
}

function visibilityBadge(visibility: string) {
  return visibility === "ORG_WIDE" ? (
    <>
      <Globe className="w-3 h-3" /> Org Wide
    </>
  ) : (
    <>
      <Lock className="w-3 h-3" /> Private
    </>
  );
}

// ─── Auth Form (Login / Register toggle) ────────────────────────────────────
function AuthForm({ onAuth }: { onAuth: (token: string, user: AuthUser) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("alice@acme.com");
  const [password, setPassword] = useState("password123");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const switchMode = (next: "login" | "register") => {
    setMode(next);
    setError("");
    if (next === "register") {
      setEmail("");
      setPassword("");
      setOrgName("");
    } else {
      setEmail("alice@acme.com");
      setPassword("password123");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data =
        mode === "login"
          ? await apiLogin(email, password)
          : await apiRegister(email, password, orgName.trim() || undefined);
      onAuth(data.token, data.user);
    } catch (err: unknown) {
      setError(
        authErrorMessage(err, mode === "login" ? "Sign in failed" : "Sign up failed")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
            A
          </div>
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight">
          {mode === "login" ? "Sign in to Atlas" : "Create your Atlas account"}
        </CardTitle>
        <CardDescription>
          Search your internal documents with cited answers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          key={mode}
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 animate-in fade-in duration-200"
        >
          <div className="space-y-2">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoFocus
            />
          </div>

          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="auth-org">
                Organization name{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="auth-org"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Acme Inc."
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === "register" ? 8 : undefined}
            />
          </div>

          {error && <p className="text-sm text-destructive font-medium">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full h-10 mt-1">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === "login" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <p className="text-sm text-center text-muted-foreground mt-5">
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="text-primary font-medium hover:underline underline-offset-2"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-primary font-medium hover:underline underline-offset-2"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Auth Modal (wraps AuthForm for guest mode) ─────────────────────────────
function AuthModal({
  onClose,
  onAuth,
}: {
  onClose: () => void;
  onAuth: (token: string, user: AuthUser) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm animate-in fade-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-3 -right-3 z-10 w-7 h-7 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <AuthForm
          onAuth={(token, user) => {
            onAuth(token, user);
            onClose();
          }}
        />
      </div>
    </div>
  );
}

// ─── Upload Form (inline) ───────────────────────────────────────────────────
function UploadForm({
  token,
  onCreated,
  onClose,
}: {
  token: string;
  onCreated: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState("PRIVATE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError("");
    try {
      await createDocument(token, title.trim(), visibility);
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(authErrorMessage(err, "Upload failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-lg border-accent/30">
      <CardHeader>
        <CardTitle className="text-base">Add Document</CardTitle>
        <CardDescription>
          Register a document. File upload via S3 arrives in Phase 3.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="space-y-2">
            <Label htmlFor="doc-title">Document Title</Label>
            <Input
              id="doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q4_Budget.pdf"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-visibility">Visibility</Label>
            <select
              id="doc-visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="PRIVATE">Private</option>
              <option value="ORG_WIDE">Org Wide</option>
            </select>
          </div>
          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          <div className="flex gap-2 mt-1">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Documents
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  // Query
  const [queryText, setQueryText] = useState("");
  const [queryResult, setQueryResult] = useState<QueryResponse | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  // Upload
  const [showUpload, setShowUpload] = useState(false);

  // Restore session from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("atlas_token");
    const savedUser = localStorage.getItem("atlas_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleAuth = useCallback((newToken: string, newUser: AuthUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("atlas_token", newToken);
    localStorage.setItem("atlas_user", JSON.stringify(newUser));
  }, []);

  const handleLogout = useCallback(() => {
    setToken(null);
    setUser(null);
    setDocuments([]);
    setQueryResult(null);
    localStorage.removeItem("atlas_token");
    localStorage.removeItem("atlas_user");
  }, []);

  // Fetch documents when logged in
  const fetchDocs = useCallback(async () => {
    if (!token) return;
    setDocsLoading(true);
    try {
      const docs = await getDocuments(token);
      setDocuments(docs);
    } catch {
      // Token may be expired
    } finally {
      setDocsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  // Handle query — guests get prompted to sign in instead of a silent no-op
  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim()) return;
    if (!token) {
      setShowAuthModal(true);
      return;
    }
    setQueryLoading(true);
    try {
      const result = await queryDocuments(token, queryText.trim());
      setQueryResult(result);
    } catch {
      setQueryResult(null);
    } finally {
      setQueryLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              A
            </div>
            <h1 className="font-semibold text-lg tracking-tight">Atlas</h1>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {user.email}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {roleLabel(user.role)}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleLogout}
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                  Guest mode
                </Badge>
                <Button size="sm" onClick={() => setShowAuthModal(true)} className="gap-1.5">
                  <LogIn className="w-4 h-4" />
                  Sign in
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Search bar */}
        <div className="flex flex-col items-center justify-center mb-10 space-y-5">
          <h2 className="text-2xl font-semibold text-center mt-4">
            What do you need to know?
          </h2>
          <form onSubmit={handleQuery} className="w-full max-w-2xl relative">
            <Search className="absolute left-4 top-3 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              id="search-input"
              className="w-full h-12 pl-12 pr-24 text-base rounded-xl shadow-sm border-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              placeholder="Ask a question about your documents..."
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
            />
            <Button
              type="submit"
              disabled={queryLoading || !queryText.trim()}
              className="absolute right-1.5 top-1.5 h-9 px-5 rounded-lg font-medium"
            >
              {queryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ask"}
            </Button>
          </form>
          {!user && (
            <p className="text-xs text-muted-foreground">
              You&apos;re browsing as a guest — you&apos;ll need to{" "}
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="text-primary font-medium hover:underline underline-offset-2"
              >
                sign in
              </button>{" "}
              to get an answer.
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Left: Answer panel */}
          <div className="md:col-span-2 space-y-6">
            {queryResult ? (
              <Card className="shadow-sm border-border overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge variant="secondary" className="mb-2 text-xs font-normal">
                        Answered using {queryResult.meta.documents_searched}{" "}
                        {pluralDocs(queryResult.meta.documents_searched)} you have
                        access to
                      </Badge>
                      <CardTitle className="text-lg font-semibold leading-relaxed">
                        {queryResult.answer}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {queryResult.sources.map((source, i) => {
                    const doc = documents.find((d) => d.id === source.doc_id);
                    return (
                      <div
                        key={`${source.doc_id}-${i}`}
                        className="p-6 bg-card border-b border-border last:border-b-0"
                      >
                        <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                          <FileText className="w-4 h-4" />
                          <span className="font-medium">
                            {doc?.title || "Unknown Document"}
                          </span>
                          <span className="mx-1">·</span>
                          <span>Page {source.page_num}</span>
                          {doc && (
                            <Badge
                              variant="outline"
                              className="ml-auto flex items-center gap-1 text-xs border-primary/20 text-primary bg-primary/5"
                            >
                              {visibilityBadge(doc.visibility)}
                            </Badge>
                          )}
                        </div>
                        <div className="p-4 rounded-lg bg-muted text-sm leading-relaxed">
                          <p>
                            <span className="bg-accent/30 text-foreground px-1 py-0.5 rounded transition-all duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)]">
                              {source.chunk_text}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Search className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-sm">
                  Ask a question to search across your documents
                </p>
              </div>
            )}
          </div>

          {/* Right: Documents sidebar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                Your Documents
              </h3>
              {user && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowUpload(!showUpload)}
                  aria-label="Add document"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>

            {showUpload && token && (
              <UploadForm token={token} onCreated={fetchDocs} onClose={() => setShowUpload(false)} />
            )}

            {!user ? (
              <Card className="shadow-sm border-border">
                <CardContent className="p-6 text-center text-sm text-muted-foreground space-y-3">
                  <p>Sign in to see your documents</p>
                  <Button size="sm" onClick={() => setShowAuthModal(true)} className="gap-1.5">
                    <LogIn className="w-4 h-4" />
                    Sign in
                  </Button>
                </CardContent>
              </Card>
            ) : docsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length === 0 ? (
              <Card className="shadow-sm border-border">
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  No documents yet. Click + to add one.
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-sm border-border">
                <CardContent className="p-4 flex flex-col gap-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-start justify-between group">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-muted rounded transition-colors group-hover:bg-accent/10">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{doc.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {statusLabel(doc.status)} ·{" "}
                            {new Date(doc.created_at).toLocaleDateString("en-US")}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1 text-xs whitespace-nowrap shrink-0"
                      >
                        {visibilityBadge(doc.visibility)}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} onAuth={handleAuth} />
      )}
    </div>
  );
}
