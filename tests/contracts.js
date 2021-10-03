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
const new_authority = anchor.web3.Keypair.generate();


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
        assert.ok(pool.authority.equals(user.publicKey));
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
        const  transaction =  await program.rpc.updatePool(newApy,new_authority.publicKey,
            {
                accounts: {
                    poolAccount:admin.publicKey,
                    authority: admin.publicKey
                },
                signers: [admin]
            });
        const pool = await program.account.poolAccount.fetch(admin.publicKey);
        assert.ok(pool.rewardApy === newApy);
        assert.ok(previous_pool.rewardApy !== pool.rewardApy);
    }).timeout(20000);
    it("Create Campaign by architect", async () => {
        const pool = await program.account.poolAccount.fetch(admin.publicKey);
        const offChainReference = new anchor.BN(1213);
        const period = new anchor.BN(14) ;
        const min_builder= new anchor.BN(5) ;
        const min_validator= new anchor.BN(5) ;
        const reward_per_builder = new anchor.BN(3) ;
        const reward_per_validator = new anchor.BN(2) ;
        const validation_quorum = 64 ;
        const topic_domain = "my topic";
        const topic_subject = "new subject";
        const topic_explain = "here is my explain";
        const seed_phrase = "write sentence about solana";

        await program.rpc.createCampaign(
            offChainReference,
            period,
            min_builder,
            min_validator,
            reward_per_builder,
            reward_per_validator,
            validation_quorum,
            topic_domain,
            topic_subject,
            topic_explain,
            seed_phrase,
            {
                accounts: {
                    campaign: architect.publicKey,
                    architect: architect.publicKey,
                    pool: admin.publicKey
                },
                instructions: [
                    await program.account.campaign.createInstruction(architect),
                ],
                signers: [architect],
            });
        const campaign = await program.account.campaign.fetch(architect.publicKey);
        const campaignAddr = await program.account.campaign.associatedAddress(architect.publicKey);
        console.log("\tcampaign address ",campaignAddr.toBase58());
        assert.ok(campaign.minBuilder.eq(min_builder));
    }).timeout(20000);
    it("Create Campaign by architectB", async () => {
        const pool = await program.account.poolAccount.fetch(admin.publicKey);
        const offChainReference = new anchor.BN(1213);
        const period = new anchor.BN(14) ;
        const min_builder= new anchor.BN(5) ;
        const min_validator= new anchor.BN(5) ;
        const reward_per_builder = new anchor.BN(3) ;
        const reward_per_validator = new anchor.BN(2) ;
        const validation_quorum = 64 ;
        const topic_domain = "my topic";
        const topic_subject = "new subject";
        const topic_explain = "here is my explain";
        const seed_phrase = "write sentence about solana";
        await program.rpc.createCampaign(
            offChainReference,
            period,
            min_builder,
            min_validator,
            reward_per_builder,
            reward_per_validator,
            validation_quorum,
            topic_domain,
            topic_subject,
            topic_explain,
            seed_phrase,
            {
                accounts: {
                    campaign: architectB.publicKey,
                    architect: architectB.publicKey,
                    pool: admin.publicKey
                },
                instructions: [
                    await program.account.campaign.createInstruction(architectB),
                ],
                signers: [architectB],
            });
        const campaign = await program.account.campaign.fetch(architectB.publicKey);
        const campaignAddr = await program.account.campaign.associatedAddress(architectB.publicKey);
        console.log("\tcampaign address ",campaignAddr.toBase58());
        assert.ok(campaign.minBuilder.eq(min_builder));
    }).timeout(20000);
    it("Get a architect for a campaign", async () => {
        const campaign = await program.account.campaign.fetch(architect.publicKey);
        const campaignAddr = await program.account.campaign.associatedAddress(architect.publicKey);
        console.log("\tArchitects for campaign : ",campaignAddr.toBase58());
        console.log("\t\tis:", campaign.architect.toBase58());
    });
    it("Get All Campaign", async () => {
        const pool = await program.account.poolAccount.fetch(admin.publicKey);
        let campaigns = pool.campaigns;
        for(let z=0; z<pool.head;z++){
            const campaignAddr = await program.account.campaign.associatedAddress(campaigns[z]);
            console.log("\tarchitect ",campaigns[z].toBase58(),"\tcreated campaign ",campaignAddr.toBase58());
        }
    });

    it("Submit 3 Utterance to an ontology", async () => {
        let utterance = "hello utterance";
        const pool = await program.account.poolAccount.fetch(admin.publicKey);
        const campaign = await program.account.campaign.fetch(architect.publicKey);
        for (i=0 ;i<3;i++){
            const transaction = await program.rpc.utterance(
                utterance+i,
                {
                    accounts: {
                        builder: builder.publicKey,
                        campaign: architect.publicKey,
                        pool : admin.publicKey,
                    },
                    signers:[builder]
                }
            );
        }

        const campaignData = await program.account.campaign.fetch(architect.publicKey);
        const campaignAddr = await program.account.campaign.associatedAddress(architect.publicKey);
        console.log("\t",campaignData.head.toString()," utterances submited to campaign : ",campaignAddr.toBase58());
        let utter = new TextDecoder("utf-8").decode(new Uint8Array(campaignData.utterances[0].data));
        for (j=0;j<campaignData.head;j++){
            let test = new TextDecoder("utf-8").decode(new Uint8Array(campaignData.utterances[j].data));
            console.log("\tutterance : ",test,
                " submitted by ",campaignData.utterances[j].builder.toBase58(),
                "and validation status :",campaignData.utterances[j].validated);
        }
        assert.ok(utter.startsWith("hello"));
    }).timeout(90000);

    it("validate 2 Utterance of 3 submitted", async () => {
        const pool = await program.account.poolAccount.fetch(admin.publicKey);

        const campaignData = await program.account.campaign.fetch(architect.publicKey);
        const campaignAddr = await program.account.campaign.associatedAddress(architect.publicKey);
        let utterance0 = new TextDecoder("utf-8").decode(new Uint8Array(campaignData.utterances[0].data));
        let utterance1 = new TextDecoder("utf-8").decode(new Uint8Array(campaignData.utterances[1].data));

       // validated first submitted utterance
        if (utterance0.startsWith("hello utterance0") ) {
            await program.rpc.validate(
                new anchor.BN(0),
                true,
                {
                    accounts: {
                        validator: validator.publicKey,
                        campaign: architect.publicKey,
                        pool : admin.publicKey,
                    },
                    signers:[validator]
                }
            );
       }
        // refuse second submitted utterance
       if (utterance1.startsWith("hello utterance1") ) {
           await program.rpc.validate(
               new anchor.BN(1),
               true,
               {
                   accounts: {
                       validator: validator.publicKey,
                       campaign: architect.publicKey,
                       pool : admin.publicKey,
                   },
                   signers:[validator]
               }
           );
       }

    }).timeout(90000);

    it("Get the current status of Ontology", async () => {
        const pool = await program.account.poolAccount.fetch(admin.publicKey);
        const campaign = await program.account.campaign.fetch(architect.publicKey);
        for (j=0;j<campaign.head;j++){
            let test = new TextDecoder("utf-8").decode(new Uint8Array(campaign.utterances[j].data));
            if (campaign.utterances[j].validated){
                console.log("\tutterance : ",test,
                    "\n\tbuilder is ",campaign.utterances[j].builder.toBase58(),
                    "\n\tvalidator is ",campaign.utterances[j].validator.toBase58(),
                    "\n\tvalidation status :",campaign.utterances[j].isValid);
            }

        }
    }).timeout(90000);
});

