import { KeyManager, KeystoreType } from "./keymanager";
import { Commitment, Connection, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

// Re-exports
export { KeystoreType };
export * from "./instructionbuilder";

export class core {

    readonly keymanager: KeyManager;
    readonly connection: Connection;

    private constructor(
        keymanager: KeyManager,
        connection: Connection
    ) {
        this.keymanager = keymanager;
        this.connection = connection;
    }

    static async CreateAsync(
        keystoreType: KeystoreType = process.env.KEYSTORE_TYPE as KeystoreType,
        connection?: Connection
    ) {
        if (!keystoreType) {
            throw new Error("Keystore type is not defined in environment variables.");
        }
    
        let keymanager: KeyManager;
    
        switch (keystoreType) {
            case KeystoreType.Local:
                const { LocalKeyManager } = await import('./keymanagers/localkeymanager');
                keymanager = new LocalKeyManager();
                break;
            case KeystoreType.Ledger:
                const { LedgerKeyManager } = await import('./keymanagers/ledgerkeymanager');
                keymanager = await LedgerKeyManager.createAsync();
                break;
            case KeystoreType.Turnkey:
                const { TurnKeyManager } = await import('./keymanagers/turnkeymanager');
                keymanager = new TurnKeyManager();
                break;
            case KeystoreType.Environment:
                const { EnvironmentKeyManager } = await import('./keymanagers/environmentkeymanager');
                keymanager = new EnvironmentKeyManager();
                break;
            default:
                throw new Error(`Unsupported keystore type: ${keystoreType}`);
        }
    
        // Use the provided connection or create a new one
        const conn = connection || new Connection(
            process.env.RPC_URL || "https://api.mainnet-beta.solana.com", // Default RPC URL if not provided
            process.env.COMMITMENT as Commitment || "processed"
        );
    
        return new core(keymanager, conn);
    }

    GetKeystoreType() {
        return process.env.KEYSTORE_TYPE;
    }

    async BuildTransaction(ix: TransactionInstruction[], payer: PublicKey) {
        console.log(`Building Transaction`);
        const connection = this.connection;

        // create v0 compatible message
        console.log(`Getting latest blockhash`);
        let {blockhash} = await connection.getLatestBlockhash();

        console.log(`Creating message`);
        const messageV0 = new TransactionMessage({
            payerKey: payer,
            recentBlockhash: blockhash,
            instructions: ix,
        }).compileToV0Message();

        console.log(`Creating versioned transaction`);
        return new VersionedTransaction(messageV0);
    }

    async SignTransaction(txn: VersionedTransaction) {
        // Sign a transaction using keymanager.
        await this.keymanager.sign(txn);
    }

    async SendTransaction(txn: VersionedTransaction) {
        // Send a transaction to the network.
        return this.connection.sendTransaction(txn);
    }
}