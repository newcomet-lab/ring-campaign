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
const {TOKEN_PROGRAM_ID,Token} = require('@solana/spl-token');
const {createTokenAccount, sleep} = require("@project-serum/common");
const TokenInstructions = require("@project-serum/serum").TokenInstructions;

describe('Initialize Data Yield Farm', () => {
    anchor.setProvider(anchor.Provider.env());

    const data_idl = JSON.parse(
        require('fs')
            .readFileSync('target/idl/Datafarm.json', 'utf8')
            .toString())

    const program = new anchor.Program(data_idl, data_idl.metadata.address, anchor.getProvider());
    const provider = anchor.getProvider();
    let admin ;
    let mint  = new anchor.web3.PublicKey('BSNHwP8nRzvgurmn6FPxUQkWY2KYC64FGPMU1QKzxuiD');
    let poolVault  =new anchor.web3.PublicKey('DEhtrRycYC2gZmv4z9WCD6qvPrtWdLD8dEHPY4qr856y');
    it("Initialize Pool", async () => {
        const architect_stake = new anchor.BN(20);
        const builder_stake = new anchor.BN(20);
        const validator_stake = new anchor.BN(20);
        const reward_apy = 10;
        const reward_per_block = new anchor.BN(3);
        const pool_cap = new anchor.BN(250000000);
        const penalty = new anchor.BN(3);
        const [pda,bump] = await anchor.web3.PublicKey.findProgramAddress(
            [Buffer.from(anchor.utils.bytes.utf8.encode("Staking"))],
            program.programId
        );
        await program.state.rpc.new(
            architect_stake, builder_stake, validator_stake,
            reward_apy, pool_cap, penalty, reward_per_block,
            {
                accounts: {
                    authority: provider.wallet.publicKey,
                    pda:pda ,
                    mint: mint,
                    vault: poolVault,
                    stakingProgram: program.programId,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                },
                signers: [provider.wallet]
            });
        let pool = await program.state.fetch();
        const change_vault = await mint.getAccountInfo(pool.vault);

        assert.ok(change_vault.owner, pda);
    }).timeout(90000);
});