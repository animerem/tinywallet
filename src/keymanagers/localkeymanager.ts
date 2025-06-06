import { Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { KeyManager } from "../keymanager";
import {existsSync, readFileSync, unlinkSync, writeFileSync} from "fs";

export class LocalKeyManager implements KeyManager {

    keystorePath: string;

    constructor() {
        this.keystorePath = "./default_key.json";
    }

    purgeKey() {
        if (existsSync(this.keystorePath)) {
            unlinkSync(this.keystorePath);
        }
    }

    async getAddress(): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                resolve(this.loadKey().publicKey.toBase58());
            } catch (e) {
                reject();
            }
        });
    }

    generateKey(overwrite: boolean = false) {

        if (existsSync(this.keystorePath) && !overwrite) {
            throw new Error("Keystore file already exists. Use overwrite flag to overwrite the file.");
        }

        const kp = Keypair.generate();

        // Write the private key to file using the keystorePath.
        writeFileSync(this.keystorePath, `[${kp.secretKey}]`);
    }

    loadKey(): Keypair {
        const secret = JSON.parse(readFileSync(this.keystorePath).toString()) as number[];
        const secretKey = Uint8Array.from(secret);
        return Keypair.fromSecretKey(secretKey);
    }

    getPublicKey(): Promise<PublicKey> {
        return new Promise((resolve, reject) => {
            try {
                resolve(this.loadKey().publicKey);
            } catch (e) {
                reject();
            }
        });
    }

    sign(txn: VersionedTransaction) {
        txn.sign([this.loadKey()]);
    }
}