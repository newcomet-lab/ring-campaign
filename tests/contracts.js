const anchor = require("@project-serum/anchor");
const assert = require("assert");
const fs = require("fs");
const {PublicKey} = require("@solana/web3.js");
const {getMint} = require("./helper");

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
const customer = anchor.web3.Keypair.generate();
const customerB = anchor.web3.Keypair.generate();
const architect = anchor.web3.Keypair.generate();
const architectB = anchor.web3.Keypair.generate();
const builder = anchor.web3.Keypair.generate();
const validator = anchor.web3.Keypair.generate();

describe('contracts', () => {

    it("log users", async () => {
        console.log("\thadi: ", hadi.publicKey.toBase58());
        console.log("\tadmin : ",admin.publicKey.toBase58());
        console.log("\tarchitect : ",architect.publicKey.toBase58());
        console.log("\tbuilder : ",builder.publicKey.toBase58());
        console.log("\tvalidator : ",validator.publicKey.toBase58());
        console.log("\tcustomer : ",customer.publicKey.toBase58());
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
                    poolAccount : admin.publicKey,
                    poolAuthority: user.publicKey,
                    sns : SNS
                },
            signers: [admin],
            instructions: [await program.account.poolAccount.createInstruction(admin)],

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
    it("Update Mining Pool APY", async () => {
        const previous_pool = await program.account.poolAccount.fetch(admin.publicKey);
        const newApy = 13 ;
        const  transaction =  await program.rpc.updatePool(newApy,
            {
                accounts: {
                    poolAccount:admin.publicKey,
                    newAuthority: admin.publicKey
                },
                signers: [admin]
            });
        const pool = await program.account.poolAccount.fetch(admin.publicKey);
        assert.ok(pool.rewardApy === newApy);
        assert.ok(previous_pool.rewardApy !== pool.rewardApy);
    }).timeout(20000);

    it("Create Campaign by customer", async () => {
        const pool = await program.account.poolAccount.fetch(admin.publicKey);
        const offChainReference = new anchor.BN(1213);
        const period = new anchor.BN(14) ;
        const min_builder= new anchor.BN(5) ;
        const min_validator= new anchor.BN(5) ;
        const title = "first campaign";
        const description = "create data set for support system";
        const reward_per_utterance = new anchor.BN(2) ;
        const validation_quorum = 64 ;

        await program.rpc.createCampaign(
            offChainReference,
            period,
            min_builder,
            min_validator,
            title,
            description,
            reward_per_utterance,
            validation_quorum,
            {
                accounts: {
                    campaign: customer.publicKey,
                    pool: admin.publicKey
                },
                instructions: [
                    await program.account.campaign.createInstruction(customer),
                ],
                signers: [customer],
            });
        const campaign = await program.account.campaign.fetch(customer.publicKey);
        const campaignAddr = await program.account.campaign.associatedAddress(customer.publicKey);
        console.log("\tcampaign address ",campaignAddr.toBase58());
        assert.ok(campaign.minimumBuilder.eq(min_builder));
    }).timeout(20000);
    it("Create Campaign by customerB", async () => {
        const pool = await program.account.poolAccount.fetch(admin.publicKey);
        const offChainReference = new anchor.BN(1314);
        const period = new anchor.BN(7) ;
        const min_builder= new anchor.BN(6) ;
        const min_validator= new anchor.BN(5) ;
        const title = "first campaign";
        const description = "create data set for support system";
        const reward_per_utterance = new anchor.BN(1) ;
        const validation_quorum = 64 ;

        await program.rpc.createCampaign(
            offChainReference,
            period,
            min_builder,
            min_validator,
            title,
            description,
            reward_per_utterance,
            validation_quorum,
            {
                accounts: {
                    campaign: customerB.publicKey,
                    pool: admin.publicKey
                },
                instructions: [
                    await program.account.campaign.createInstruction(customerB),
                ],
                signers: [customerB],
            });
        const campaign = await program.account.campaign.fetch(customerB.publicKey);
        const campaignAddrB = await program.account.campaign.associatedAddress(customerB.publicKey);
        console.log("\tcampaign address ",campaignAddrB.toBase58());
        assert.ok(campaign.minimumBuilder.eq(min_builder));
    }).timeout(20000);

    it("Create Ontology by architect by customer", async () => {

        const stake_amount = new anchor.BN(1000);
        const stake_period = new anchor.BN(7) ;
        const  transaction =  await program.rpc.architectInit(
            stake_amount,
            stake_period,
            {
                accounts: {
                    ontologyAccount: architect.publicKey,
                    architect: architect.publicKey,
                    campaign: customer.publicKey,
                    pool :admin.publicKey,
                },
                instructions: [
                    await program.account.ontologyAccount.createInstruction(architect),
                ],
                signers: [architect],
            });
        const ontology = await program.account.ontologyAccount.fetch(architect.publicKey);
        const pool = await program.account.poolAccount.fetch(admin.publicKey);
        const campaign = await program.account.campaign.fetch(customer.publicKey);
        assert.ok(true);
    }).timeout(30000);
    it("Create Ontology by architectB by customer", async () => {
        const stake_amount = new anchor.BN(1000);
        const stake_period = new anchor.BN(7) ;
        const  transaction =  await program.rpc.architectInit(
            stake_amount,
            stake_period,
            {
                accounts: {
                    ontologyAccount: architectB.publicKey,
                    architect: architectB.publicKey,
                    campaign: customer.publicKey,
                    pool :admin.publicKey,
                },
                instructions: [
                    await program.account.ontologyAccount.createInstruction(architectB),
                ],
                signers: [architectB],
            });
        const ontology = await program.account.ontologyAccount.fetch(architectB.publicKey);
        const pool = await program.account.poolAccount.fetch(admin.publicKey);
        const campaign = await program.account.campaign.fetch(customer.publicKey);
        assert.ok(true);
    }).timeout(30000);

    it("Get all ontologies for a campaign", async () => {
        const campaign = await program.account.campaign.fetch(customer.publicKey);
        const campaignAddr = await program.account.campaign.associatedAddress(customer.publicKey);
        console.log("\tArchitects for campaign : ",campaignAddr.toBase58());
        for (let k = 0; k < campaign.architects.length; k += 1) {
            console.log("\t\tAddress:", campaign.architects[k].toBase58());
        }
    });

    it("Submit Utterance to an ontology", async () => {
        let utterance = "hello";
        const pool = await program.account.poolAccount.fetch(admin.publicKey);
        const campaign = await program.account.campaign.fetch(customer.publicKey);
        console.log("\t\tAddress:", campaign.architects[0].toBase58());

        const transaction = await program.rpc.utterance(
            utterance, {
                accounts: {
                    builder: builder.publicKey,
                    ontologyAccount: campaign.architects[0],
                    campaign: customer.publicKey,
                    pool : admin.publicKey,
                },
            }
        );
        const ontology = await program.account.ontologyAccount.fetch(campaign.architects[0]);
        let utter = new TextDecoder("utf-8").decode(new Uint8Array(ontology.utterances[0].data));
        assert.ok(utter.startsWith("hello"));
    }).timeout(90000);
});

