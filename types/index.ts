// ────────────────────────────────────────────────────────────────────────────
// Auth
// ────────────────────────────────────────────────────────────────────────────

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
}

export type UserRole = "super_admin" | "user";

export interface UserResponse {
  id: string;
  username: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_approved: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export interface ConsentResponse {
  id: string;
  user_id: string;
  consent_type: "terms" | "privacy" | "marketing" | "analytics";
  accepted: boolean;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Projects
// ────────────────────────────────────────────────────────────────────────────

export interface ProjectConfig {
  assistant_name: string | null;
  company_name: string | null;
  assistant_role: string | null;
  assistant_tone: string | null;
  assistant_avatar: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_website: string | null;
  default_language: string | null;
  fallback_behavior: string | null;
  enable_web_search: boolean;
  model: string | null;
  temperature: number | null;
  max_tokens: number | null;
  max_context_messages: number | null;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  api_key: string | null;
  agent_token?: string | null;
  agent_token_masked?: string | null;
  api_key_masked: string;
  is_active: boolean;
  owner_id: string;
  owner_username: string;
  created_at: string;
  updated_at: string;
  config: ProjectConfig | null;
}

export interface ProjectListResponse {
  projects: Project[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ProjectSetupSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  api_key_masked: string;
  agent_token_masked: string | null;
  agent_token_active: boolean;
  agent_token_rotated_at: string | null;
  has_db_config: boolean;
  connection_mode: "direct" | "local_agent" | null;
  db_enabled: boolean;
  db_consent: boolean;
  db_type: string | null;
  db_host: string | null;
  db_port: number | null;
  db_name: string | null;
  db_ssl_mode: string | null;
  agent_base_url: string | null;
  db_last_tested_at: string | null;
  db_last_test_success: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProjectSetupListResponse {
  projects: ProjectSetupSummary[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface CreateProjectPayload {
  name: string;
  slug?: string;
  description?: string;
  assistant_name?: string;
  company_name?: string;
  assistant_role?: string;
  assistant_tone?: string;
  max_context_messages?: number;
  contact_email?: string;
  contact_phone?: string;
  contact_website?: string;
}

export type UpdateProjectPayload = Partial<CreateProjectPayload>;

export interface RotateKeyResponse {
  project_id: string;
  new_api_key: string;
  warning: string;
  rotated_at: string;
}

export interface RevealKeyResponse {
  project_id: string;
  api_key: string;
  warning: string;
}

export interface RevealAgentTokenResponse {
  project_id: string;
  agent_token: string;
  token_prefix: string;
  warning: string;
}

// ────────────────────────────────────────────────────────────────────────────
// RAG Files
// ────────────────────────────────────────────────────────────────────────────

export type RagFileStatus = "processing" | "ready" | "error";

export interface RagFile {
  id: string;
  project_id: string;
  filename: string;
  file_type: string;
  size_bytes: number;
  status: RagFileStatus;
  chunks_count: number | null;
  error_message: string | null;
  uploaded_at: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Conversations & Messages
// ────────────────────────────────────────────────────────────────────────────

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  project_id: string;
  session_id: string | null;
  user_id: string | null;
  username: string | null;
  created_at: string;
  updated_at?: string;
  message_count: number;
}

export interface ConversationDetail extends Conversation {
  messages: ConversationMessage[];
}

export interface ConversationListResponse {
  conversations: Conversation[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Chat
// ────────────────────────────────────────────────────────────────────────────

export interface ChatStreamChunk {
  content?: string;
  done?: boolean;
  error?: string;
  conversation_id?: string;
  source_type?: string;
  cached?: boolean;
  response_time?: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Knowledge Sources
// ────────────────────────────────────────────────────────────────────────────

export type HttpMethod = "GET" | "POST" | "PUT";

export interface KnowledgeSource {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  url: string;
  method: HttpMethod;
  headers: Record<string, string> | null;
  api_key: string | null;
  payload: Record<string, unknown> | null;
  response_path: string | null;
  text_field: string | null;
  timeout: number;
  is_enabled: boolean;
  scope_keywords: string[];
  last_tested_at: string | null;
  last_test_success: boolean | null;
  last_test_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeSourceListResponse {
  project_id: string;
  total: number;
  sources: KnowledgeSource[];
}

export interface CreateKnowledgeSourcePayload {
  name: string;
  description?: string;
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  api_key?: string;
  payload?: Record<string, unknown>;
  response_path?: string;
  text_field?: string;
  timeout?: number;
  is_enabled?: boolean;
  scope_keywords?: string[];
}

export type UpdateKnowledgeSourcePayload = Partial<CreateKnowledgeSourcePayload>;

export interface KnowledgeSourceTestResult {
  success: boolean;
  status_code: number | null;
  response_preview: string | null;
  error: string | null;
}

// ────────────────────────────────────────────────────────────────────────────
// Analytics
// ────────────────────────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  total_conversations: number;
  total_messages: number;
  unique_users: number;
  avg_response_time_ms: number;
  avg_messages_per_conversation: number;
  satisfaction_rate: number;
  rag_usage_rate: number;
  total_tokens_used?: number;
}

export interface AnalyticsTrend {
  date: string;
  conversations: number;
  messages: number;
  avg_response_time_ms: number;
  tokens_used?: number;
  satisfaction_rate?: number;
}

export interface TopQuestion {
  question: string;
  count: number;
  avg_satisfaction?: number;
  avg_response_time_ms?: number;
  last_asked?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Project External Database Config
// ────────────────────────────────────────────────────────────────────────────

export type ProjectDatabaseType = "postgres" | "mysql";
export type ProjectConnectionMode = "direct" | "local_agent" | "ssh_tunnel";
export type ProjectDatabaseSslMode =
  | "disable"
  | "allow"
  | "prefer"
  | "require"
  | "verify-ca"
  | "verify-full";

export interface ProjectDatabaseConfig {
  project_id: string;
  connection_mode: ProjectConnectionMode;
  db_type: ProjectDatabaseType;
  host: string | null;
  port: number | null;
  db_name: string | null;
  db_user: string | null;
  ssl_mode: ProjectDatabaseSslMode;
  agent_base_url: string | null;
  ssh_host?: string | null;
  ssh_port?: number | null;
  ssh_user?: string | null;
  ssh_auth_method?: "password" | "private_key" | null;
  ssh_remote_host?: string | null;
  ssh_remote_port?: number | null;
  is_enabled: boolean;
  consent_share_data: boolean;
  consent_at: string | null;
  consent_version: string | null;
  include_tables: string[];
  exclude_tables: string[];
  connect_timeout_seconds: number;
  statement_timeout_ms: number;
  max_rows: number;
  last_tested_at: string | null;
  last_test_success: boolean | null;
  last_test_error: string | null;
  has_password: boolean;
  has_agent_token: boolean;
  has_ssh_password?: boolean;
  has_ssh_private_key?: boolean;
}

export interface UpsertProjectDatabaseConfigPayload {
  connection_mode: ProjectConnectionMode;
  db_type: ProjectDatabaseType;
  host?: string;
  port?: number;
  db_name?: string;
  db_user?: string;
  db_password?: string;
  ssl_mode: ProjectDatabaseSslMode;
  agent_base_url?: string;
  agent_token?: string;
  ssh_host?: string;
  ssh_port?: number;
  ssh_user?: string;
  ssh_auth_method?: "password" | "private_key";
  ssh_password?: string;
  ssh_private_key?: string;
  ssh_private_key_passphrase?: string;
  ssh_remote_host?: string;
  ssh_remote_port?: number;
  is_enabled: boolean;
  consent_share_data: boolean;
  consent_version: string;
  include_tables: string[];
  exclude_tables: string[];
  connect_timeout_seconds: number;
  statement_timeout_ms: number;
  max_rows: number;
}

export interface ProjectDatabaseTestResult {
  success: boolean;
  database: string;
  user: string;
  tables_preview: string[];
}

export interface FailedQuery {
  query: string;
  error_type: string;
  count: number;
  last_occurred: string;
  sample_context?: string;
}

export interface SatisfactionStats {
  total_feedbacks: number;
  positive_count: number;
  negative_count: number;
  satisfaction_rate: number;
  trend: "improving" | "declining" | "stable";
  by_category: Record<string, number>;
}

export interface CostStats {
  total_tokens_input: number;
  total_tokens_output: number;
  estimated_cost_usd: number;
  cost_by_model: Record<string, number>;
  cost_trend: AnalyticsTrend[];
}

// ────────────────────────────────────────────────────────────────────────────
// Activities
// ────────────────────────────────────────────────────────────────────────────

export type ActivityType =
  | "project_created"
  | "project_updated"
  | "project_deleted"
  | "conversation_started"
  | "user_first_message"
  | "file_uploaded"
  | "api_key_rotated"
  | "api_key_revoked";

export interface Activity {
  id: string;
  activity_type: ActivityType | string;
  actor_user_id: string | null;
  actor_username: string | null;
  project_id: string | null;
  project_name: string | null;
  conversation_id: string | null;
  end_user_id: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  message: string;
}

export interface ActivityListResponse {
  activities: Activity[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  unread_count: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Support Tickets
// ────────────────────────────────────────────────────────────────────────────

export type TicketStatus = "open" | "in_progress" | "closed";

export interface SupportTicket {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  project_id: string | null;
  status: TicketStatus;
  admin_note: string | null;
  created_at: string;
}

export interface CreateTicketPayload {
  name: string;
  email: string;
  message: string;
  subject?: string;
  project_id?: string;
}

export interface UpdateTicketPayload {
  status: TicketStatus;
  admin_note?: string;
}

export interface SupportContent {
  hero?: { title: string; subtitle: string };
  contact_info?: { email: string; response_time: string };
  faq?: { items: { question: string; answer: string }[] };
}

// ────────────────────────────────────────────────────────────────────────────
// Documentation content (public + admin editable)
// ────────────────────────────────────────────────────────────────────────────

export interface DocumentationHero {
  title: string;
  subtitle: string;
}

export interface DocumentationOverviewModule {
  title: string;
  points: string[];
}

export interface DocumentationOverview {
  title: string;
  intro: string;
  modules: DocumentationOverviewModule[];
}

export interface DocumentationDevCard {
  title: string;
  description: string;
}

export interface DocumentationDev {
  title: string;
  intro: string;
  cards: DocumentationDevCard[];
  integration_steps: string[];
  payload_example: string;
}

export interface DocumentationQaArea {
  area: string;
  checks: string;
}

export interface DocumentationQa {
  title: string;
  intro: string;
  strategy: string[];
  area_checks: DocumentationQaArea[];
}

export interface DocumentationContent {
  hero: DocumentationHero;
  overview: DocumentationOverview;
  dev: DocumentationDev;
  qa: DocumentationQa;
}

// ────────────────────────────────────────────────────────────────────────────
// Service utility
// ────────────────────────────────────────────────────────────────────────────

export type { ServiceResult } from "@/lib/api/result";
