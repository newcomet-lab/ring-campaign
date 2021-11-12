const anchor = require("@project-serum/anchor");
const common = require("@project-serum/common");
const {BN} = anchor;
const {Keypair, PublicKey, SystemProgram, Transaction} = anchor.web3;
const splToken = require('@solana/spl-token');

const Token = require("@solana/spl-token").Token;
const TOKEN_PROGRAM_ID = require("@solana/spl-token").TOKEN_PROGRAM_ID;
const TokenInstructions = require("@project-serum/serum").TokenInstructions;

const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

const findAssociatedTokenAddress = async (
    walletAddress,
    tokenMintAddress
) => {
    return (
        await PublicKey.findProgramAddress(
            [
                walletAddress.toBuffer(),
                TOKEN_PROGRAM_ID.toBuffer(),
                tokenMintAddress.toBuffer(),
            ],
            SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
        )
    )[0];
};
const userCharge = async (mint, owner, authority) => {
    const tokenAccount = await mint.getOrCreateAssociatedAccountInfo(owner.publicKey);
    await mint.mintTo(
        tokenAccount.address,
        authority,
        [],
        1000_000_000_000 // 1 followed by decimals number of 0s // You'll ask the creator ki how many decimals he wants in his token. If he says 4, then 1 token will be represented as 10000
    );
    const account = await mint.getOrCreateAssociatedAccountInfo(owner.publicKey);
    return account
};
const vaultCharge = async (mint, owner, authority) => {
    const tokenAccount = await mint.getOrCreateAssociatedAccountInfo(owner.publicKey);
    await mint.mintTo(
        tokenAccount.address,
        authority,
        [],
        1000_000_000_000_000
    );
    const account = await mint.getOrCreateAssociatedAccountInfo(owner.publicKey);
    return account
};

const ourCharge = async (mint, owner, authority) => {
    const tokenAccount = await mint.getOrCreateAssociatedAccountInfo(owner);
    await mint.mintTo(
        tokenAccount.address,
        authority,
        [],
        1000_000_000_000
    );
    const account = await mint.getOrCreateAssociatedAccountInfo(owner);
    return account
};

module.exports = {
    userCharge,ourCharge,vaultCharge,findAssociatedTokenAddress
};
