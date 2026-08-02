import { Alert, Button, Stack, Text, TextInput, Title } from "@mantine/core";
import { useState } from "react";
import type { MfaSetup } from "../api/auth";
import { useCurrentUser, useMfaDisable, useMfaEnable, useMfaSetup } from "../hooks/useAuth";

export function MfaSettings() {
  const { data: user } = useCurrentUser();
  const setup = useMfaSetup();
  const enable = useMfaEnable();
  const disable = useMfaDisable();
  const [setupData, setSetupData] = useState<MfaSetup | null>(null);
  const [code, setCode] = useState("");

  if (!user) return null;

  const startSetup = () => {
    setCode("");
    setup.mutate(undefined, { onSuccess: (data) => setSetupData(data) });
  };

  const cancelSetup = () => {
    setSetupData(null);
    setCode("");
    setup.reset();
    enable.reset();
  };

  const confirmEnable = () => {
    enable.mutate(code, {
      onSuccess: () => {
        setSetupData(null);
        setCode("");
      },
    });
  };

  const confirmDisable = () => {
    disable.mutate(code, { onSuccess: () => setCode("") });
  };

  const friendlyError = (err: unknown) =>
    (err as Error).message === "MFA_INVALID_CODE"
      ? "Invalid code — check your authenticator app and try again"
      : (err as Error).message;

  return (
    <Stack maw={420} mx="auto" mt={40} mb={80}>
      <Title order={3}>Two-factor authentication</Title>

      {user.isOtpEnabled ? (
        <>
          <Alert color="green">Two-factor authentication is enabled.</Alert>
          {disable.error && <Alert color="red">{friendlyError(disable.error)}</Alert>}
          <Text size="sm">
            To disable it, enter a current code from your authenticator app.
          </Text>
          <TextInput
            label="Authentication code"
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.currentTarget.value)}
          />
          <Button
            color="red"
            variant="light"
            loading={disable.isPending}
            disabled={code.length !== 6}
            onClick={confirmDisable}
          >
            Disable 2FA
          </Button>
        </>
      ) : setupData ? (
        <>
          <Text size="sm">
            Scan this QR code with your authenticator app (or enter the secret manually), then
            confirm with a code.
          </Text>
          <img
            src={`data:image/png;base64,${setupData.qrCodeBase64}`}
            alt="TOTP QR code"
            width={200}
            height={200}
            style={{ alignSelf: "center" }}
          />
          <Text size="xs" ff="monospace" ta="center">
            {setupData.secret}
          </Text>
          {enable.error && <Alert color="red">{friendlyError(enable.error)}</Alert>}
          <TextInput
            label="Authentication code"
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.currentTarget.value)}
          />
          <Button loading={enable.isPending} disabled={code.length !== 6} onClick={confirmEnable}>
            Confirm and enable
          </Button>
          <Button variant="subtle" onClick={cancelSetup}>
            Cancel
          </Button>
        </>
      ) : (
        <>
          <Text size="sm">
            Protect your account with a time-based one-time code (TOTP) from an authenticator app.
          </Text>
          {setup.error && <Alert color="red">{(setup.error as Error).message}</Alert>}
          <Button variant="light" loading={setup.isPending} onClick={startSetup}>
            Enable 2FA
          </Button>
        </>
      )}
    </Stack>
  );
}
