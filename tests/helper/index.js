const anchor = require("@project-serum/anchor");
const common = require("@project-serum/common");
const { TOKEN_PROGRAM_ID, Token } = require("@solana/spl-token");
const { BN } = anchor;
const { Keypair, PublicKey, SystemProgram, Transaction } = anchor.web3;

const getMint = async ({ provider, name }) => {
    const decimals = 6;
    const amount = new anchor.BN(1_000_000_000_000_000);

    const [mint, god] = await common.createMintAndVault(
        provider,
        amount,
        undefined,
        decimals
    );

    return { mint, god, amount, decimals, name };
};

module.exports = {
    getMint
};
