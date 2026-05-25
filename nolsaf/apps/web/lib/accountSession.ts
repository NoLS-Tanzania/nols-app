export type AccountSession = {
  id: number;
  role?: string | null;
  email?: string | null;
  name?: string | null;
  fullName?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  profileImage?: string | null;
  isDisabled?: boolean;
  isSuspended?: boolean;
};

type AccountSessionResult = {
  ok: boolean;
  status: number;
  data: AccountSession | null;
  response: Response;
};

export async function fetchAccountSession(init?: RequestInit): Promise<AccountSessionResult> {
  const response = await fetch("/api/account/session", {
    ...init,
    credentials: "include",
  });

  if (!response.ok) {
    return { ok: false, status: response.status, data: null, response };
  }

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    // ignore malformed optional session payloads
  }

  return {
    ok: true,
    status: response.status,
    data: (json?.data ?? json ?? null) as AccountSession | null,
    response,
  };
}
