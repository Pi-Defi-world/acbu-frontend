import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../auth-context";

vi.mock("@/lib/api/user", () => ({
  getMe: vi.fn().mockRejectedValue({ status: 401 }),
}));

function AuthHarness() {
  const { userId, stellarAddress, isAuthenticated, login } = useAuth();

  return (
    <div>
      <div data-testid="user-id">{userId ?? "null"}</div>
      <div data-testid="stellar-address">{stellarAddress ?? "null"}</div>
      <div data-testid="is-authenticated">{String(isAuthenticated)}</div>
      <button type="button" onClick={() => login("user-1", "GABC123")}>
        login
      </button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("stores the supplied user id and stellar address when login is called", async () => {
    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    expect(await screen.findByTestId("user-id")).toHaveTextContent("user-1");
    expect(screen.getByTestId("stellar-address")).toHaveTextContent("GABC123");
    expect(screen.getByTestId("is-authenticated")).toHaveTextContent("true");
    expect(sessionStorage.getItem("acbu_user_id")).toBe("user-1");
    expect(sessionStorage.getItem("acbu_stellar_address")).toBe("GABC123");
  });
});
