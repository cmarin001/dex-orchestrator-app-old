import { Component, type ReactNode } from "react";
import Button from "@atlaskit/button/new";
import SectionMessage from "@atlaskit/section-message";
import Spinner from "@atlaskit/spinner";
import Tooltip from "@atlaskit/tooltip";
import { Text, Inline } from "@atlaskit/primitives";
import { auth0Enabled } from "../api/auth-mode";
import { signIn } from "../api/auth";
import { ApiError } from "../api/client";
import { useConnection } from "../app/Connection";
import { useMessage } from "../i18n/messages";

export function ErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  const m = useMessage();
  if (!error) return null;
  const api = error instanceof ApiError ? error : null;
  const label = api?.code === "recent_mfa_required" ? m("recentMfa")
    : api?.code === "insufficient_scope" ? m("authForbidden")
    : api?.code === "auth_unavailable" ? m("authUnavailable")
    : api?.status === 401 ? m("unauthorized")
    : api?.status === 409 ? m("conflict", { id: api.requestId ?? m("unavailable") })
    : api?.code === "invalid_origin" ? m("invalidOrigin")
    : api?.code === "missing_token" ? m("missingToken")
    : api?.code === "network" ? m("network")
    : api?.code === "invalid_response" ? m("invalidResponse")
    : api?.code === "invalid_response_data" ? m("dataError") : m("error");
  return <div role="alert"><SectionMessage appearance="error" title={label}>
    {api && api.status > 0 && api.code !== "http_error" && <BackendText value={api.message} />}
    {auth0Enabled() && api?.code === "recent_mfa_required" && <Button onClick={signIn}>{m("signIn")}</Button>}
    {retry && <Button onClick={retry}>{m("retry")}</Button>}
  </SectionMessage></div>;
}

export function BackendText({ value }: { value: unknown }) {
  const m = useMessage();
  const { session } = useConnection();
  if (value === undefined || value === null) return <Text>{m("unavailable")}</Text>;
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const source = m(session.kind === "sample" ? "sourceSample" : "sourceBackend");
  return <Tooltip content={source}><code title={source} className="backend-text">{text}</code></Tooltip>;
}

export function Loading() {
  const m = useMessage();
  return <div role="status"><Inline space="space.100" alignBlock="center"><Spinner size="small" /><Text>{m("loading")}</Text></Inline></div>;
}

export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidUpdate(previous: { resetKey?: string }) {
    if (previous.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    return this.state.error ? <ErrorNotice error={this.state.error} retry={() => this.setState({ error: null })} /> : this.props.children;
  }
}
