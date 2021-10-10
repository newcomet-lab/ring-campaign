const anchor = require('@project-serum/anchor');

const assert = require("assert");
const fs = require("fs");
const {SYSVAR_RENT_PUBKEY,
    PublicKey,
    Keypair,
    SystemProgram,} = require("@solana/web3.js");
const {userCharge,poolVaultGen} = require("./helper");
const splToken = require('@solana/spl-token');
const {sleep} = require("@project-serum/common");
const TokenInstructions = require("@project-serum/serum").TokenInstructions;
/*anchor.setProvider(anchor.Provider.local("https://api.devnet.solana.com"));
const data_idl = JSON.parse(
    require('fs')
        .readFileSync('target/idl/contracts.json', 'utf8')
        .toString())
const staking_idl = JSON.parse(
    require('fs')
        .readFileSync('target/idl/staking.json', 'utf8')
        .toString());
const dataId = new anchor.web3.PublicKey("GWzBR7znXxEVDkDVgQQu5Vpzu3a5G4e5kPXaE9MvebY2");
const stakingId = new anchor.web3.PublicKey("HgaSDFf4Vc9gWajXhNCFaAC1epszwqS2zzbAhuJpA5Ev");
const provider = anchor.getProvider();
const dataProgram = new anchor.Program(data_idl, data_idl.metadata.address, provider);
const stakingProgram = new anchor.Program(staking_idl, staking_idl.metadata.address, provider);*/

describe('datafarm', () => {
    anchor.setProvider(anchor.Provider.env());
    const provider = anchor.getProvider();
    const SNS = new anchor.web3.PublicKey("4x9tT6a8hjs6YztPJs9ZHUimQaxBetVFYTsDAAfh8Luz");
    const data_idl = JSON.parse(
        require('fs')
            .readFileSync('target/idl/Datafarm.json', 'utf8')
            .toString())
    const staking_idl = JSON.parse(
        require('fs')
            .readFileSync('target/idl/Staking.json', 'utf8')
            .toString());
    const dataProgram =new anchor.Program(data_idl, data_idl.metadata.address, anchor.getProvider());
    const stakingProgram =new anchor.Program(staking_idl, staking_idl.metadata.address, anchor.getProvider());


    const ks_hadi = fs.readFileSync("/home/hadi/.config/solana/id.json", {encoding: 'utf8'});
    const kb_hadi = Buffer.from(JSON.parse(ks_hadi));
    let hadi = new anchor.web3.Account(kb_hadi);

    const ks_owner = fs.readFileSync("/home/hadi/.config/solana/devnet.json", {encoding: 'utf8'});
    const kb_owner = Buffer.from(JSON.parse(ks_owner));
    let owner = new anchor.web3.Account(kb_owner);


    const user = anchor.web3.Keypair.generate();
    const admin = anchor.web3.Keypair.generate();
    const customer = anchor.web3.Keypair.generate();
    const customerB = anchor.web3.Keypair.generate();
    const architect = anchor.web3.Keypair.generate();
    const architectStake = anchor.web3.Keypair.generate();
    const architectB = anchor.web3.Keypair.generate();
    const builder = anchor.web3.Keypair.generate();
    const validator = anchor.web3.Keypair.generate();
    const new_authority = anchor.web3.Keypair.generate();

    let architectToken = undefined;
    let architecBtToken = undefined;
    let builderToken = undefined;
    let validatorToken = undefined;
    let mint= undefined;
    let poolVault= undefined;

    it("log users", async () => {
        console.log("\thadi: ", hadi.publicKey.toBase58());
        console.log("\tadmin : ",admin.publicKey.toBase58());
        console.log("\tarchitect : ",architect.publicKey.toBase58());
        console.log("\tbuilder : ",builder.publicKey.toBase58());
        console.log("\tvalidator : ",validator.publicKey.toBase58());
        console.log("\tcustomer : ",customer.publicKey.toBase58());
        assert.ok(true);
    }).timeout(90000);
    it("Airdrop SNS token to users", async () => {
        mint = await splToken.Token.createMint(provider.connection,owner, owner.publicKey, null, 9,  splToken.TOKEN_PROGRAM_ID,)
        console.log('\tSNS Token public address: ' + mint.publicKey.toBase58());
        architectToken  = await userCharge(mint,architect,owner);
        architectBToken  = await userCharge(mint,architectB,owner);
        builderToken  = await userCharge(mint,builder,owner);
        validatorToken  = await userCharge(mint,validator,owner);
        poolVault  = await poolVaultGen(mint,owner,owner);
        console.log("\tarchitect have ",architectToken.amount/1000000000," SNS");
        console.log("\tbuilder have ",builderToken.amount/1000000000," SNS");
        console.log("\tvalidator have ",validatorToken.amount/1000000000," SNS");
        assert.ok(architect.publicKey.equals(architectToken.owner));
        assert.ok(builder.publicKey.equals(builderToken.owner));
        assert.ok(validator.publicKey.equals(validatorToken.owner));
    }).timeout(90000);
    it("Creates Mining Pool", async () => {
        const architect_stake = new anchor.BN(20) ;
        const builder_stake = new anchor.BN(20) ;
        const validator_stake = new anchor.BN(20) ;
        const reward_apy = 10 ;
        const pool_cap = new anchor.BN(250000000) ;
        const penalty = new anchor.BN(2) ;

        const  transaction =  await dataProgram.rpc.initPool(
            architect_stake,builder_stake,validator_stake,
            reward_apy,pool_cap,penalty,
            {
                accounts: {
                    poolAccount : admin.publicKey,
                    poolAuthority: user.publicKey,
                    sns : mint.publicKey
                },
                signers: [admin],
                instructions: [await dataProgram.account.poolAccount.createInstruction(admin)],

            });
        const pool = await dataProgram.account.poolAccount.fetch(admin.publicKey);
        assert.ok(pool.snsMint.equals(mint.publicKey));
        assert.ok(pool.authority.equals(user.publicKey));
        assert.ok(pool.architectStake.eq(architect_stake));
        assert.ok(pool.builderStake.eq(builder_stake));
        assert.ok(pool.validatorStake.eq(validator_stake));
        assert.ok(pool.poolCap.eq(pool_cap));
        assert.ok(pool.penalty.eq(penalty));
        assert.ok(pool.rewardApy === reward_apy);
    }).timeout(10000);
    it("Update Mining Pool APY", async () => {
        const previous_pool = await dataProgram.account.poolAccount.fetch(admin.publicKey);
        const newApy = 13 ;
        const  transaction =  await dataProgram.rpc.updatePool(newApy,new_authority.publicKey,
            {
                accounts: {
                    poolAccount:admin.publicKey,
                    authority: admin.publicKey
                },
                signers: [admin]
            });
        const pool = await dataProgram.account.poolAccount.fetch(admin.publicKey);
        const pooladdress = await dataProgram.account.poolAccount.associatedAddress(admin.publicKey);

        assert.ok(pool.rewardApy === newApy);
        assert.ok(previous_pool.rewardApy !== pool.rewardApy);
    }).timeout(20000);
    it("Create Campaign by architect", async () => {
        const pool = await dataProgram.account.poolAccount.fetch(admin.publicKey);
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
        const CampaignSeed = 'CampaignCreate';
        await dataProgram.rpc.createCampaign(
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
                    campaignAccount: architect.publicKey,
                    architect: architect.publicKey,
                    pool: admin.publicKey,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                },
                instructions: [
                    await dataProgram.account.campaignAccount.createInstruction(architect),
                ],
                signers: [architect],
            });

        const campaign = await dataProgram.account.campaignAccount.fetch(architect.publicKey);
        const campaignAddr = await dataProgram.account.campaignAccount.associatedAddress(architect.publicKey);
        console.log("\tcampaign address ",campaignAddr.toBase58());
        assert.ok(campaign.minBuilder.eq(min_builder));
    }).timeout(20000);
    it("Architect stake to campaign", async () => {
        const pool = await dataProgram.account.poolAccount.associatedAddress(admin.publicKey);
        const amount = new anchor.BN(64);
        const CampaignSeed = 'CampaignCreate';
        const baseAccount = anchor.web3.Keypair.generate();
        const baseToken= await userCharge(mint,baseAccount,owner);
        await stakingProgram.rpc.deposit(
            amount,
            8,
            {
                accounts: {
                    stakeAccount: builder.publicKey,
                    user: builder.publicKey,
                    userToken : builderToken.address,
                 //   pool: admin.publicKey,
                    poolVault : poolVault.address,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                },
                instructions: [
                    await stakingProgram.account.stakeAccount.createInstruction(builder),
                ],
                signers: [builder],
            });
        const campaign = await stakingProgram.account.stakeAccount.fetch(builder.publicKey);
        const campaignAddr = await stakingProgram.account.stakeAccount.associatedAddress(builder.publicKey);
        console.log("\tcampaign address ",campaignAddr.toBase58());
        assert.ok(campaign.minBuilder.eq(min_builder));
    }).timeout(20000);
/*
    it("Create Campaign by architect", async () => {
        const pool = await dataProgram.account.poolAccount.fetch(admin.publicKey);
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
        const CampaignSeed = 'CampaignCreate';
        const [ArchitectFirst ,nonce]= await PublicKey.findProgramAddress(
            [architect.publicKey.toBuffer(),admin.publicKey.toBuffer()],
            dataProgram.programId
        );
        console.log("first ",ArchitectFirst.toBase58(),"nonce",nonce);
        await dataProgram.rpc.createCampaign(
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
                    campaignAccount: architect.publicKey,
                    architect: architect.publicKey,
                    pool: admin.publicKey,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                },
                instructions: [
                    await dataProgram.account.campaignAccount.createInstruction(architect),
                ],
                signers: [architect],
            });

        const campaign = await dataProgram.account.campaign.fetch(ArchitectFirst);
        const campaignAddr = await dataProgram.account.campaign.associatedAddress(ArchitectFirst);
        console.log("\tcampaign address ",campaignAddr.toBase58());
        assert.ok(campaign.minBuilder.eq(min_builder));
    }).timeout(20000);
   it("Architect stake to campaign", async () => {
        const pool = await dataProgram.account.poolAccount.associatedAddress(admin.publicKey);
        const amount = 64 ;
        const CampaignSeed = 'CampaignCreate';
        const [ArchitectSecond ,nonce]= await anchor.web3.PublicKey.findProgramAddress(
            [architect.publicKey.toBuffer(),Buffer.from(anchor.utils.bytes.utf8.encode(CampaignSeed))],
            stakingProgram.programId
        );
        console.log("second ",ArchitectSecond.toBase58());
        await stakingProgram.rpc.deposit(
            amount,
            nonce,
            {
                accounts: {
                    stakeAccount: architect.publicKey,
                    architect: architect.publicKey,
                    //pool: pool,
                    architectToken : architectToken.address,
                    poolVault : poolVault.address,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,

                },
                instructions: [
                    await stakingProgram.account.campaign.createInstruction(architect),
                ],
                signers: [architect],
            });
        const campaign = await stakingProgram.account.campaign.fetch(ArchitectSecond);
        const campaignAddr = await stakingProgram.account.campaign.associatedAddress(ArchitectSecond);
        console.log("\tcampaign address ",campaignAddr.toBase58());
        assert.ok(campaign.minBuilder.eq(min_builder));
    }).timeout(20000);*/
/*    it("Create Campaign by architectB", async () => {
        const pool = await program.account.poolAccount.fetch(admin.publicKey);
        const offChainReference = new anchor.BN(1213);
        const period = new anchor.BN(14) ;
        const min_builder= new anchor.BN(7) ;
        const min_validator= new anchor.BN(3) ;
        const reward_per_builder = new anchor.BN(2) ;
        const reward_per_validator = new anchor.BN(3) ;
        const validation_quorum = 65 ;
        const topic_domain = "my topic 2";
        const topic_subject = "new subject 2";
        const topic_explain = "here is my explain 2";
        const seed_phrase = "write sentence about solana 2";

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
                    pool: admin.publicKey,
                    architectToken : architectBToken.address,
                    snsMint : mint.publicKey ,
                    poolVault : poolVault.address,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,

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
    }).timeout(90000);

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
    }).timeout(90000);*/
});

