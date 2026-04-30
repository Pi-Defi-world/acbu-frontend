import {
  Asset,
  Horizon,
  Keypair,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import type { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";
import { getAssetsConfig } from "@/lib/api/config";

const TESTNET_HORIZON_URL =
  process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ??
  "https://horizon-testnet.stellar.org";
const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

async function resolveHorizonUrl(): Promise<string> {
  try {
    const cfg = await getAssetsConfig();
    if (cfg.stellar.horizon_url) return cfg.stellar.horizon_url;
  } catch {
    // fall through to env default
  }
  return TESTNET_HORIZON_URL;
}

async function resolveNetworkPassphrase(): Promise<string> {
  try {
    const cfg = await getAssetsConfig();
    if (cfg.stellar.network_passphrase) return cfg.stellar.network_passphrase;
  } catch {
    // fall through
  }
  return TESTNET_PASSPHRASE;
}

async function resolveAcbuAsset(): Promise<Asset> {
  try {
    const cfg = await getAssetsConfig();
    if (cfg.acbu.issuer) {
      return new Asset(cfg.acbu.code || "ACBU", cfg.acbu.issuer);
    }
  } catch {
    // fall through to native
  }
  // Match backend behavior: if issuer is not configured, use native.
  return Asset.native();
}

export function looksLikeStellarAddress(value: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(value.trim());
}

export async function submitAcbuPaymentClient(params: {
  destination: string;
  amount: string;
  userSecret?: string;
  external?: { kit: StellarWalletsKit; address: string };
}): Promise<{ transactionHash: string; sourceAddress: string }> {
  const horizonUrl = await resolveHorizonUrl();
  const networkPassphrase = await resolveNetworkPassphrase();
  const asset = await resolveAcbuAsset();
  const server = new Horizon.Server(horizonUrl);

  const sourceAddress = params.external?.address
    ? params.external.address
    : params.userSecret
      ? Keypair.fromSecret(params.userSecret).publicKey()
      : null;
  if (!sourceAddress) {
    throw new Error("Missing wallet credentials (secret or external address).");
  }

  const sourceAccount = await server.loadAccount(sourceAddress);
  const tx = new TransactionBuilder(sourceAccount, {
    fee: "100",
    networkPassphrase,
  })
    .addOperation(
      Operation.payment({
        destination: params.destination,
        asset,
        amount: params.amount,
      }),
    )
    .setTimeout(0)
    .build();

  if (params.external?.kit) {
    const { signedTxXdr } = await params.external.kit.signTransaction(tx.toXDR(), {
      address: sourceAddress,
      networkPassphrase,
    });
    const signed = TransactionBuilder.fromXDR(signedTxXdr, networkPassphrase);
    const res = await server.submitTransaction(signed);
    return { transactionHash: res.hash, sourceAddress };
  }

  if (!params.userSecret) {
    throw new Error("Missing wallet secret.");
  }
  const kp = Keypair.fromSecret(params.userSecret);
  tx.sign(kp);
  const res = await server.submitTransaction(tx);
  return { transactionHash: res.hash, sourceAddress };
}
