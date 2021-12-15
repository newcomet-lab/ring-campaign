const anchor = require('@project-serum/anchor');
const os = require("os");
const assert = require("assert");
const fs = require("fs");
const {
    SYSVAR_RENT_PUBKEY,
    PublicKey,
    Keypair,
    SystemProgram,
} = require("@solana/web3.js");
const {userCharge, ourCharge, vaultCharge,findAssociatedTokenAddress, hash} = require("./helper");
const splToken = require('@solana/spl-token');
const {createTokenAccount} = require("@project-serum/common");
const TokenInstructions = require("@project-serum/serum").TokenInstructions;

describe('Initialize Data Yield Farm', () => {
    anchor.setProvider(anchor.Provider.env());
    const provider = anchor.getProvider();
    const data_idl = JSON.parse(
        require('fs')
            .readFileSync('target/idl/Datafarm.json', 'utf8')
            .toString())

    const program = new anchor.Program(data_idl, data_idl.metadata.address, anchor.getProvider());
    let admin ;
    let mint;
    it("Create SNS token for test", async () => {
        admin = anchor.web3.Keypair.generate();
        await provider.connection.requestAirdrop(admin.publicKey, 3000000000);
        mint = await splToken.Token.createMint(provider.connection, admin, admin.publicKey, admin.publicKey, 9, splToken.TOKEN_PROGRAM_ID);
        console.log('\ttest SNS Token address: ' + mint.publicKey.toBase58());
    }).timeout(90000);

    it("Initialize Pool", async () => {
        const architect_stake = new anchor.BN(20);
        const builder_stake = new anchor.BN(20);
        const validator_stake = new anchor.BN(20);
        const reward_apy = 10;
        const reward_per_block = new anchor.BN(3);
        const pool_cap = new anchor.BN(250000000);
        const penalty = new anchor.BN(3);
        const poolVault = await mint.getOrCreateAssociatedAccountInfo(admin.publicKey);
        await program.state.rpc.new(
            architect_stake, builder_stake, validator_stake,
            reward_apy, pool_cap, penalty, reward_per_block,
            {
                accounts: {
                    authority: admin.publicKey,
                    mint: mint.publicKey,
                    vault: poolVault.address,
                    stakingProgram: program.programId,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                },
                signers: [admin]
            });
        let pool = await program.state.fetch();
        const change_vault = await mint.getAccountInfo(pool.vault);
        const pda = await anchor.web3.PublicKey.findProgramAddress(
            [Buffer.from(anchor.utils.bytes.utf8.encode("Staking"))],
            program.programId
        )[0];
        assert.ok(change_vault.owner, pda);
    }).timeout(90000);
});