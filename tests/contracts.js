const anchor = require("@project-serum/anchor");
const assert = require("assert");
const fs = require("fs");
const {PublicKey} = require("@solana/web3.js");
const { getMint} = require("./helper");


anchor.setProvider(anchor.Provider.local("https://api.devnet.solana.com"));
const idl = JSON.parse(
    require('fs')
        .readFileSync('target/idl/contracts.json', 'utf8')
        .toString());
const programId = new anchor.web3.PublicKey("GWzBR7znXxEVDkDVgQQu5Vpzu3a5G4e5kPXaE9MvebY2");
const provider = anchor.getProvider();
const program = new anchor.Program(idl, programId, provider);
const SNS = new anchor.web3.PublicKey("51LAPRbcEvheteGQjSgAFV6rrEvjL4P2igvzPH8bu88");


const ks_hadi = fs.readFileSync("/home/hadi/.config/solana/id.json", {encoding: 'utf8'});
const kb_hadi = Buffer.from(JSON.parse(ks_hadi));
let hadi = new anchor.web3.Account(kb_hadi);

const user = anchor.web3.Keypair.generate();
const admin = anchor.web3.Keypair.generate();
const architect = anchor.web3.Keypair.generate();
const builder = anchor.web3.Keypair.generate();
const validator = anchor.web3.Keypair.generate();

describe('contracts', () => {
    it("log users", async () => {
        console.log("\thadi: ", hadi.publicKey.toBase58());
        console.log("\tadmin : ",admin.publicKey.toBase58());
        console.log("\tarchitect : ",architect.publicKey.toBase58());
        console.log("\tbuilder : ",builder.publicKey.toBase58());
        console.log("\tvalidator : ",validator.publicKey.toBase58());
        assert.ok(true);
    });
    it("Creates Mining Pool", async () => {
        const architect_stake = new anchor.BN(20) ;
        const builder_stake = new anchor.BN(20) ;
        const validator_stake = new anchor.BN(20) ;
        const reward_apy = 10 ;
        const pool_cap = new anchor.BN(250000000) ;
        const penalty = new anchor.BN(2) ;
        const  transaction =  await program.rpc.initPool(
            architect_stake,builder_stake,validator_stake,
            reward_apy,pool_cap,penalty,
            {
                accounts: {
                    poolAccount: admin.publicKey,
                    poolAuthority: user.publicKey,
                    sns : SNS
                },
            signers: [admin],
            instructions: [
                await program.account.poolAccount.createInstruction(admin),
            ],
        });
        const pool = await program.account.poolAccount.fetch(admin.publicKey);
        assert.ok(pool.snsMint.equals(SNS));
        assert.ok(pool.distributionAuthority.equals(user.publicKey));
        assert.ok(pool.architectStake.eq(architect_stake));
        assert.ok(pool.builderStake.eq(builder_stake));
        assert.ok(pool.validatorStake.eq(validator_stake));
        assert.ok(pool.poolCap.eq(pool_cap));
        assert.ok(pool.penalty.eq(penalty));
        assert.ok(pool.rewardApy === reward_apy);
    }).timeout(10000);

});

