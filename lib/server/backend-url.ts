export function getBackendApiUrl() {
  return (
    process.env.BACKEND_API_URL ||
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8087/api/v1"
  );
}
