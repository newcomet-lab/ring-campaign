const anchor = require("@project-serum/anchor");
const common = require("@project-serum/common");
const {BN} = anchor;
const {Keypair, PublicKey, SystemProgram, Transaction} = anchor.web3;
const splToken = require('@solana/spl-token');
const { createHash } = require('crypto');
const {createTokenAccount} = require("@project-serum/common");
const Token = require("@solana/spl-token").Token;
const TOKEN_PROGRAM_ID = require("@solana/spl-token").TOKEN_PROGRAM_ID;
const TokenInstructions = require("@project-serum/serum").TokenInstructions;

const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);
const  hash= function(string) {
    return createHash('sha256').update(string).digest('hex');
}
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

const getTokenAccountAndAirdrop = async (provider,program,pda,mint,user) => {
    const tokenAccount = await createTokenAccount(provider,mint,user);
    await program.rpc.airdrop(
        {
            accounts: {
                userToken :tokenAccount,
                pdaAccount :pda,
                tokenMint: mint,
                tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
            },
        });
    return (tokenAccount);
};

module.exports = {
    findAssociatedTokenAddress,hash,getTokenAccountAndAirdrop
};
