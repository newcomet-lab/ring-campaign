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
const TokenInstructions = require("@project-serum/serum").TokenInstructions;

describe('ringfi', () => {
    anchor.setProvider(anchor.Provider.env());
    const provider = anchor.getProvider();
    const data_idl = JSON.parse(
        require('fs')
            .readFileSync('target/idl/Ringfi.json', 'utf8')
            .toString())

    const dataProgram = new anchor.Program(data_idl, data_idl.metadata.address, anchor.getProvider());

    const tester = new anchor.web3.PublicKey("FGrfSpb4mHxRAsmj8jsPuDibiwkmaL1CcWeHFHyt2cXJ");
    const tester2 = new anchor.web3.PublicKey("GEVkD15abk9Yvy4zhJaNs5sFJmgD8oaAFASvj9oz6Scn");
    const tester3 = new anchor.web3.PublicKey("64BDoRi8Cor1iKmKpPuGR9x4hE5sbsohtbiBsbDnzyqy");
    const tester4 = new anchor.web3.PublicKey("DgBxsrQiXpDT9EYeqUeyWBbrjWEmxwZveygVDziNwxSs");
    const tester5 = new anchor.web3.PublicKey("8WQL2yB5yw9myW7Xo34sZ7eUTU2oME83BFi6Xa7Wwm1V");

    const tester6 = new anchor.web3.PublicKey("G7SYroD9nMcoHHWAec8miRAzYjAtbGs4G26LtLzd399R");
    const tester7 = new anchor.web3.PublicKey("5kZprvwGa2FsgpcAjTuowcfTvtEfWP4yt6vr3Vp8KKG8");

    const tester8 = new anchor.web3.PublicKey("FBvHbntEUQHThmsx6uYHfYK4VUu3LqAQGVZMzjW7bPXa");
    const tester9 = new anchor.web3.PublicKey("BU5vjZeMnNEzA4fmTUvEnzTpkPPjKg48BSJQWqPKYU1s");
    const tester10 = new anchor.web3.PublicKey("G1PGisf5RxXpbfWDjgiyMZmnDUu1RwaPNY4NddM5rbbT");
    const tester11 = new anchor.web3.PublicKey("3JsP1Ukg2kE5spZAT1xjPnofCKooM1QfX36mym7V4PQz");
    const tester12 = new anchor.web3.PublicKey("EwfgEhoojL1fDR7iX1XF28qohvWxK3y5MX1FYJL9A16a");
    const tester13 = new anchor.web3.PublicKey("GpFdEVNNHEgdUCi1qanrTSTiA8Qog6jjLHMeAAgnhk6L");
    const tester14 = new anchor.web3.PublicKey("CnzFXVJKHoeBFqfFqjaBgztaoEdqkeNmHhHvsckETEB");
    const tester15 = new anchor.web3.PublicKey("FRZG1Fjh5MsZWeTKWQvLzGd3WQLNHhD6Dg4WJxaW3p7g");
    const tester16 = new anchor.web3.PublicKey("J3hMxMJqrDjvT3P4H1mdD3sJpkTAUzo5o72JM1b3nzK5");

    const tester17 = new anchor.web3.PublicKey("8WQL2yB5yw9myW7Xo34sZ7eUTU2oME83BFi6Xa7Wwm1V");
    const tester18 = new anchor.web3.PublicKey("7UwUhgPerNEfGc8VioLMWr1P5a6x1f5iE3Fj3amptC6Y");
    const tester19 = new anchor.web3.PublicKey("FGoSVomWnpWCBbnTKRj4PCEpCeCXnAJVVr5Eq7G7zEBw");
    const tester20 = new anchor.web3.PublicKey("89hvjPpWd7dLAj6hbmqJtZSsi14DDXvsU8hjiQCJvqLD");
    const tester21 = new anchor.web3.PublicKey("niUnDBkKijY6iGSkADF5bvDeqzecd6arVcec3BfLEBR");
    const tester22 = new anchor.web3.PublicKey("9yeE9xGcBBzjT2YVvJAXZdWU15QjJt5nCSxrnx4QUxEe");
    const tester23 = new anchor.web3.PublicKey("DuSQbYGrMsN6QG6T4fcspiFbAf2KVLHDy6gvroz6pFrk");
    const tester24 = new anchor.web3.PublicKey("5Loz7APEbcBFK1cuUmdQUUzT4ST83Fxtd5qi9twQuyJx");
    const tester25 = new anchor.web3.PublicKey("C894x8WxrUUfJ38KBvcsWdidZzaQUa8hvxeFNhqPqmUY");

    const tester26 = new anchor.web3.PublicKey("EPnL4QULVj5KbfEpi3HYSagyQczCiwdLWwBNZngK6Apa");
    const tester27 = new anchor.web3.PublicKey("Co41obBYXEQhDs8z61S8io8y6DTAA3fVWjjCSmbcqsgT");
    const tester28 = new anchor.web3.PublicKey("35AEKGrVjoFQWEgrA8mCmvqbpfJ8AXn4ukAQ85Rqikin");
    const tester29 = new anchor.web3.PublicKey("DBnmK5L6Spf5f8o5Mxh4vNk1AJzKwCX8TB3yWHkHd71T");
    const tester30 = new anchor.web3.PublicKey("5FtKRiMozHk9JNAHABPR2aJVrgYgvwJbUpUMts8E7B5D");
    const tester31 = new anchor.web3.PublicKey("8pZftMk6mRXob9ZFXRyVGiGVjSi7Xb1uJgQmWnHySAmT");
    const tester32 = new anchor.web3.PublicKey("DvguvExXBPZtTmdbEuEoqQESeP7JkXUVc3iQNdJYCbQr");
    const tester33 = new anchor.web3.PublicKey("9MchLxt9gkEQQM4wsSVkWSQL2SsnoS3okEqvEDQAoSSp");
    const tester34 = new anchor.web3.PublicKey("G8YkxznDHZTcomqhoXuSE4nkdv7GTpaESkWLstnvXeqU");

    const user = os.userInfo().username;
    const key_path = "/root/.config/solana/id.json";
    const ks_owner = fs.readFileSync(key_path, {encoding: 'utf8'});
    const kb_owner = Buffer.from(JSON.parse(ks_owner));
    let owner = new anchor.web3.Account(kb_owner);

    const admin = anchor.web3.Keypair.generate();
    const customer = anchor.web3.Keypair.generate();
    const architect = new anchor.web3.Account(Buffer.from(JSON.parse("[158,210,0,206,240,214,38,48,249,117,33,95,218,111,152,39,138,15,175,187,177,191,45,2,162,3,57,181,211,7,192,44,250,247,4,214,253,14,50,19,210,13,5,79,58,80,102,96,209,16,205,101,174,201,180,248,228,73,216,223,208,16,76,240]")));
    const architectB = new anchor.web3.Account(Buffer.from(JSON.parse("[81,186,0,2,128,170,244,75,23,169,191,102,124,41,175,83,27,214,72,147,62,141,212,88,211,73,215,227,45,53,211,7,192,127,55,215,171,35,227,173,10,210,137,17,182,60,126,100,184,231,9,56,143,54,12,48,214,191,36,6,139,181,137,144]")));
    const builder = new anchor.web3.Account(Buffer.from(JSON.parse("[210,41,252,144,113,174,131,112,108,43,222,52,226,15,2,201,27,155,89,123,145,215,181,188,24,102,96,3,14,154,33,78,31,51,70,159,189,138,107,218,32,53,201,129,9,199,181,54,233,106,49,173,233,113,121,176,12,145,180,188,6,180,251,12]")));
    const validator = new anchor.web3.Account(Buffer.from(JSON.parse("[246,185,215,246,252,94,251,112,228,123,24,55,239,253,60,87,172,21,82,182,220,188,146,146,122,85,135,252,237,25,180,229,45,68,24,94,241,106,72,216,218,57,206,5,214,1,119,115,30,248,83,140,250,22,139,52,91,187,80,22,234,86,96,148]")));
    const validatorB = new anchor.web3.Account(Buffer.from(JSON.parse("[62,41,81,230,181,182,199,233,165,70,15,53,118,6,41,151,191,33,24,222,62,121,239,144,143,159,243,164,153,201,92,137,33,190,158,50,234,233,148,99,254,33,202,2,18,146,125,13,189,68,221,140,158,113,113,98,217,216,134,18,189,207,255,67]")));
    const validatorC = new anchor.web3.Account(Buffer.from(JSON.parse("[53,234,205,179,239,152,23,12,238,48,80,238,192,230,78,21,59,164,187,41,102,29,21,26,184,210,32,62,253,121,71,96,126,233,196,129,106,39,197,40,240,83,6,190,191,174,205,116,45,166,6,18,224,70,238,152,185,146,67,153,166,103,177,6]")));
    const validatorD = anchor.web3.Keypair.generate();
    const validatorE = anchor.web3.Keypair.generate();
    const validatorF = anchor.web3.Keypair.generate();
    const validatorG = anchor.web3.Keypair.generate();

    let architectToken = undefined;
    let architecBToken = undefined;
    let builderToken = undefined;
    let validatorToken = undefined;
    let validatorBToken = undefined;
    let validatorCToken = undefined;
    let mint = undefined;
    let myAccount = undefined;
    let pda = undefined;
    let bump = undefined;
    let pool_vault = undefined;
    let campaignAccount = undefined;
    it("log users", async () => {
        console.log("\towner: ", owner.publicKey.toBase58());
        console.log("\tadmin : ", admin.publicKey.toBase58());
        console.log("\tarchitect : ", architect.publicKey.toBase58());
        console.log("\tbuilder : ", builder.publicKey.toBase58());
        console.log("\tvalidator : ", validator.publicKey.toBase58());
        console.log("\tcustomer : ", customer.publicKey.toBase58());
        assert.ok(true);
    }).timeout(90000);
    it("Airdrop RING token to users", async () => {
        mint = await splToken.Token.createMint(provider.connection, owner, owner.publicKey, owner.publicKey, 9, splToken.TOKEN_PROGRAM_ID,)
        console.log('\tRING Token public address: ' + mint.publicKey.toBase58());
        architectToken = await userCharge(mint, architect, owner);
        architectBToken = await userCharge(mint, architectB, owner);
        builderToken = await userCharge(mint, builder, owner);
        validatorToken = await vaultCharge(mint, validator, owner);
        validatorBToken = await vaultCharge(mint, validatorB, owner);
        validatorCToken = await vaultCharge(mint, validatorC, owner);
        await ourCharge(mint, tester, owner);
        await ourCharge(mint, tester2, owner);
        await ourCharge(mint, tester3, owner);
        await ourCharge(mint, tester4, owner);
        await ourCharge(mint, tester5, owner);

        await ourCharge(mint, tester6, owner);
        await ourCharge(mint, tester7, owner);

        await ourCharge(mint, tester8, owner);
        await ourCharge(mint, tester9, owner);
        await ourCharge(mint, tester10, owner);
        await ourCharge(mint, tester11, owner);
        await ourCharge(mint, tester12, owner);
        await ourCharge(mint, tester13, owner);
        await ourCharge(mint, tester14, owner);
        await ourCharge(mint, tester15, owner);
        await ourCharge(mint, tester16, owner);

        await ourCharge(mint, tester17, owner);
        await ourCharge(mint, tester18, owner);
        await ourCharge(mint, tester19, owner);
        await ourCharge(mint, tester20, owner);
        await ourCharge(mint, tester21, owner);
        await ourCharge(mint, tester22, owner);
        await ourCharge(mint, tester23, owner);
        await ourCharge(mint, tester24, owner);
        await ourCharge(mint, tester25, owner);

        await ourCharge(mint, tester26, owner);
        await ourCharge(mint, tester27, owner);
        await ourCharge(mint, tester28, owner);
        await ourCharge(mint, tester29, owner);
        await ourCharge(mint, tester30, owner);
        await ourCharge(mint, tester31, owner);
        await ourCharge(mint, tester32, owner);
        await ourCharge(mint, tester33, owner);
        await ourCharge(mint, tester34, owner);

        const [_pda, _nonce] = await anchor.web3.PublicKey.findProgramAddress(
            [Buffer.from(anchor.utils.bytes.utf8.encode("Staking"))],
            dataProgram.programId
        );
        pda = _pda;
        // Mint more token to vault because we going to send reward to users
        pool_vault = await vaultCharge(mint, owner, owner);
        console.log("\tarchitect have ", architectToken.amount / 1000000000, " RING");
        console.log("\tbuilder have ", builderToken.amount / 1000000000, " RING");
        console.log("\tvalidator have ", validatorToken.amount / 1000000000, " RING");
        console.log("\tvault is ", pool_vault.address.toBase58());
        console.log("\tarchitectToken is ", architectToken.address.toBase58());
        console.log("\tbuilderToken is ", builderToken.address.toBase58());
        console.log("\tvalidatorToken is ", validatorToken.address.toBase58());
        assert.ok(architect.publicKey.equals(architectToken.owner));
        assert.ok(builder.publicKey.equals(builderToken.owner));
        assert.ok(validator.publicKey.equals(validatorToken.owner));
        await dataProgram.provider.connection.requestAirdrop(
            architect.publicKey,
            anchor.web3.LAMPORTS_PER_SOL,
        );
        await dataProgram.provider.connection.requestAirdrop(
            architectB.publicKey,
            anchor.web3.LAMPORTS_PER_SOL,
        );
        await dataProgram.provider.connection.requestAirdrop(
            builder.publicKey,
            anchor.web3.LAMPORTS_PER_SOL,
        );
        await dataProgram.provider.connection.requestAirdrop(
            validator.publicKey,
            anchor.web3.LAMPORTS_PER_SOL,
        );
        await dataProgram.provider.connection.requestAirdrop(
            validatorB.publicKey,
            anchor.web3.LAMPORTS_PER_SOL,
        );
        await dataProgram.provider.connection.requestAirdrop(
            validatorC.publicKey,
            anchor.web3.LAMPORTS_PER_SOL,
        );

    }).timeout(90000);
    it("Creates State Pool", async () => {
        const architect_stake = new anchor.BN(20);
        const builder_stake = new anchor.BN(20);
        const validator_stake = new anchor.BN(20);
        const reward_apy = 10;
        const reward_per_block = new anchor.BN(3);
        const pool_cap = new anchor.BN(250000000);
        const penalty = new anchor.BN(2);
        await dataProgram.state.rpc.new(
            architect_stake, builder_stake, validator_stake,
            reward_apy, pool_cap, penalty, reward_per_block,
            {
                accounts: {
                    authority: owner.publicKey,
                    mint: mint.publicKey,
                    vault: pool_vault.address,
                    stakingProgram: dataProgram.programId,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                },
                signers: [owner]
            });
        let pool = await dataProgram.state.fetch();
        const change_vault = await mint.getAccountInfo(pool.vault);
        assert.ok(change_vault.owner, pda);
    }).timeout(90000);

    it("Create Campaign by architect", async () => {
        const offChainReference = new anchor.BN(1213);// used by offchain system
        const period = new anchor.BN(14);// number of day for staking
        const min_builder = new anchor.BN(5);// minimum builder needed by this campaign
        const min_validator = new anchor.BN(2);/// minimum validation needed by per sentence
        const reward_per_sentence = new anchor.BN(3); // reward for builder
        const validation_quorum = new anchor.BN(3); // later used to calculate minimum corection
        const topic_domain = "my topic";
        const topic_subject = "new subject";
        const topic_explain = "here is my explain";
        const seed_phrase = "write sentence about solana";
         campaignAccount = anchor.web3.Keypair.generate();
        await dataProgram.state.rpc.createCampaign(
            offChainReference,
            period,
            min_builder,
            min_validator,
            reward_per_sentence,
            validation_quorum,
            topic_domain,
            topic_subject,
            topic_explain,
            seed_phrase,
            {
                accounts: {
                    campaignAccount: campaignAccount.publicKey,
                    architect: architect.publicKey,
                    pool: dataProgram.state.address(),
                    ringfi: dataProgram.programId,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                },
                instructions: [
                    await dataProgram.account.campaignAccount.createInstruction(campaignAccount),
                ],
                signers: [architect, campaignAccount],
            });

        const campaign = await dataProgram.account.campaignAccount.fetch(campaignAccount.publicKey);
        console.log("\tcampaign address ", campaignAccount.publicKey.toBase58());
        assert.ok(campaign.minBuilder.eq(min_builder));
    }).timeout(20000);
    it("Init stake Account for Architect", async () => {
        const role = 1 ;// architect role
        const [stakeAccount, nonce] = await PublicKey.findProgramAddress(
            [
                architect.publicKey.toBuffer(),
                campaignAccount.publicKey.toBuffer(),
                Buffer.from(anchor.utils.bytes.utf8.encode("staking"))
            ],
            dataProgram.programId
        );
        let tx = await dataProgram.rpc.initStakeAccount(nonce, role,{
            accounts: {
                stakeAccount:stakeAccount,
                authority: architect.publicKey,
                campaign:  campaignAccount.publicKey,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers:[architect]
        });
        const stake = await dataProgram.account.stakeAccount.fetch(stakeAccount);
        assert.ok(stake.userAddress, architect.publicKey);
        assert.ok(stake.role, role);
    });
   it("Architect stake to campaign", async () => {
       let pool = await dataProgram.state.fetch();
       const [stakeAccount, nonce] = await PublicKey.findProgramAddress(
           [
               architect.publicKey.toBuffer(),
               campaignAccount.publicKey.toBuffer(),
               Buffer.from(anchor.utils.bytes.utf8.encode("staking"))
           ],
           dataProgram.programId
       );
       const userToken = await findAssociatedTokenAddress(
           architect.publicKey,
           pool.mint
       );
        await dataProgram.rpc.stake(
            {
                accounts: {
                    stakeAccount: stakeAccount,
                    user: architect.publicKey,
                    userToken: userToken,
                    cpiState: dataProgram.state.address(),
                    ringfi: dataProgram.programId,
                    campaign: campaignAccount.publicKey,
                    poolVault: pool_vault.address,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                },
                signers: [architect],
            });
        const stake = await dataProgram.account.stakeAccount.fetch(stakeAccount);
        const campaign = await dataProgram.account.campaignAccount.fetch(campaignAccount.publicKey);
        assert.ok(stake.status, true)
        assert.ok(campaign.stakeStatus, true)
    }).timeout(20000);


    it("Create Campaign by architectB", async () => {
        const offChainReference = new anchor.BN(1213);
        const period = new anchor.BN(14);
        const min_builder = new anchor.BN(5);
        const min_validator = new anchor.BN(5);
        const reward_per_sentence = new anchor.BN(3);
        const validation_quorum = new anchor.BN(64);
        const topic_domain = "my topic B";
        const topic_subject = "new subject B";
        const topic_explain = "here is my explain B";
        const seed_phrase = "write sentence about blockchain";
        let campaignAccountB = anchor.web3.Keypair.generate();
        await dataProgram.state.rpc.createCampaign(
            offChainReference,
            period,
            min_builder,
            min_validator,
            reward_per_sentence,
            validation_quorum,
            topic_domain,
            topic_subject,
            topic_explain,
            seed_phrase,
            {
                accounts: {
                    campaignAccount: campaignAccountB.publicKey,
                    architect: architectB.publicKey,
                    pool: dataProgram.state.address(),
                    ringfi: dataProgram.programId,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                },
                instructions: [
                    await dataProgram.account.campaignAccount.createInstruction(campaignAccountB),
                ],
                signers: [campaignAccountB,architectB],
            });

        const campaign = await dataProgram.account.campaignAccount.fetch(campaignAccountB.publicKey);
        console.log("\tcampaign address ", campaignAccountB.publicKey.toBase58());
        assert.ok(campaign.minBuilder.eq(min_builder));
    }).timeout(20000);
    it("Get All Campaign", async () => {
        let pool = await dataProgram.state.fetch();
        for (let z = 0; z < pool.head; z++) {
            const campaign = await dataProgram.account.campaignAccount.fetch(pool.campaigns[z]);
            //
            console.log(
                "\n\tarchitect ", campaign.architect.toBase58(),
                "\n\tcreated campaign ", pool.campaigns[z].toBase58(),
                "\n\tstake status ", campaign.stakeStatus);
            if (campaign.stakeStatus===true) {
                const stake = await dataProgram.account.stakeAccount.fetch(campaign.stakeAccount);
                console.log("\tstaker : ",stake.userAddress.toBase58(),
                            "\n\tamount : ",stake.tokenAmount.toNumber()/1_000_000_000);
            }
        }
    }).timeout(90000);

    it("Init Stake Account for Builder", async () => {
        let pool = await dataProgram.state.fetch();
        const role = 2 ;// Builder role
        const [stakeAccount, nonce] = await PublicKey.findProgramAddress(
            [
                builder.publicKey.toBuffer(),
                pool.campaigns[0].toBuffer(),
                Buffer.from(anchor.utils.bytes.utf8.encode("staking"))
            ],
            dataProgram.programId
        );
        let tx = await dataProgram.rpc.initStakeAccount(nonce, role,{
            accounts: {
                stakeAccount:stakeAccount,
                authority: builder.publicKey,
                campaign:  pool.campaigns[0],
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers:[builder]
        });
        const stake = await dataProgram.account.stakeAccount.fetch(stakeAccount);
        assert.ok(stake.userAddress, builder.publicKey);
        assert.ok(stake.role, role);
        assert.ok(stake.bump, nonce);
    });
    it("builder stake to campaign", async () => {
        let pool = await dataProgram.state.fetch();
        const [stakeAccount, nonce] = await PublicKey.findProgramAddress(
            [
                builder.publicKey.toBuffer(),
                pool.campaigns[0].toBuffer(),
                Buffer.from(anchor.utils.bytes.utf8.encode("staking"))
            ],
            dataProgram.programId
        );
        const userToken = await findAssociatedTokenAddress(
            builder.publicKey,
            pool.mint
        );
        await dataProgram.rpc.stake(
            {
                accounts: {
                    stakeAccount: stakeAccount,
                    user: builder.publicKey,
                    userToken: userToken,
                    cpiState: dataProgram.state.address(),
                    ringfi: dataProgram.programId,
                    campaign: pool.campaigns[0],// selected campaign
                    poolVault: pool.vault,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                },
                signers: [builder],
            });
        const stake = await dataProgram.account.stakeAccount.fetch(stakeAccount);
        assert.ok(stake.status, true);
    }).timeout(20000);

    it("Submit 3 Sentence to an ontology", async () => {
        let sentence = "test sentence number ";
        let pool = await dataProgram.state.fetch();
        const [stakeAccount, nonce] = await PublicKey.findProgramAddress(
            [
                builder.publicKey.toBuffer(),
                pool.campaigns[0].toBuffer(),
                Buffer.from(anchor.utils.bytes.utf8.encode("staking"))
            ],
            dataProgram.programId
        );
        for (i = 0; i < 6; i++) {
            let msg = sentence+ i ;//
            const selectCampaign = pool.campaigns[0];
            const sentenceAccount= anchor.web3.Keypair.generate();
            const transaction = await dataProgram.rpc.submitSentence(
                msg,
                {
                    accounts: {
                        sentenceAccount:sentenceAccount.publicKey,
                        builder: builder.publicKey,
                        campaignAccount: selectCampaign,
                        stakeAccount:stakeAccount,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    },
                    instructions: [
                        await dataProgram.account.sentenceAccount.createInstruction(sentenceAccount),
                    ],
                    signers: [builder,sentenceAccount]
                }
            );
        }

        const campaignData = await dataProgram.account.campaignAccount.fetch(pool.campaigns[0]);
/*        const campaignAddr = await dataProgram.account.campaignAccount.associatedAddress(pool.campaigns[0]);
        console.log("\t", campaignData.head.toString(), " sentences submited to campaign : ", campaignAddr.toBase58());
        let sentence = new TextDecoder("utf-8").decode(new Uint8Array(campaignData.sentences[0].data));
        for (j = 0; j < campaignData.head; j++) {
            let test = new TextDecoder("utf-8").decode(new Uint8Array(campaignData.sentences[j].data));
            console.log("\tsentence : ", test,
                " submitted by ", campaignData.sentences[j].builder.toBase58(),
                "\n\tvalidation correct :", campaignData.sentences[j].correct.toNumber(),
                "\n\tvalidation incorrect :", campaignData.sentences[j].incorrect.toNumber(),
                "\n\t and validation status :", campaignData.sentences[j].finish
            );
        }*/
        console.log("\thead is ", campaignData.head.toNumber());
        //assert.ok(campaignData.head.toNumber() === 6);
    }).timeout(90000);

    it("Init Stake Account for validator", async () => {
        let pool = await dataProgram.state.fetch();
        const role = 3 ;// validator role
        const [stakeAccount, nonce] = await PublicKey.findProgramAddress(
            [
                validator.publicKey.toBuffer(),
                pool.campaigns[0].toBuffer(),
                Buffer.from(anchor.utils.bytes.utf8.encode("staking"))
            ],
            dataProgram.programId
        );
        let tx = await dataProgram.rpc.initStakeAccount(nonce, role,{
            accounts: {
                stakeAccount:stakeAccount,
                authority: validator.publicKey,
                campaign:  pool.campaigns[0],
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers:[validator]
        });
        const stake = await dataProgram.account.stakeAccount.fetch(stakeAccount);
        assert.ok(stake.userAddress, builder.publicKey);
        assert.ok(stake.role, role);
        assert.ok(stake.bump, nonce);
    });
    it("Init Stake Account for validatorB", async () => {
        let pool = await dataProgram.state.fetch();
        const role = 3 ;// validator role
        const [stakeAccount, nonce] = await PublicKey.findProgramAddress(
            [
                validatorB.publicKey.toBuffer(),
                pool.campaigns[0].toBuffer(),
                Buffer.from(anchor.utils.bytes.utf8.encode("staking"))
            ],
            dataProgram.programId
        );
        let tx = await dataProgram.rpc.initStakeAccount(nonce, role,{
            accounts: {
                stakeAccount:stakeAccount,
                authority: validatorB.publicKey,
                campaign:  pool.campaigns[0],
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers:[validatorB]
        });
        const stake = await dataProgram.account.stakeAccount.fetch(stakeAccount);
        assert.ok(stake.userAddress, builder.publicKey);
        assert.ok(stake.role, role);
        assert.ok(stake.bump, nonce);
    });
    it("Init Stake Account for validatorC", async () => {
        let pool = await dataProgram.state.fetch();
        const role = 3 ;// validator role
        const [stakeAccount, nonce] = await PublicKey.findProgramAddress(
            [
                validatorC.publicKey.toBuffer(),
                pool.campaigns[0].toBuffer(),
                Buffer.from(anchor.utils.bytes.utf8.encode("staking"))
            ],
            dataProgram.programId
        );
        let tx = await dataProgram.rpc.initStakeAccount(nonce, role,{
            accounts: {
                stakeAccount:stakeAccount,
                authority: validatorC.publicKey,
                campaign:  pool.campaigns[0],
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers:[validatorC]
        });
        const stake = await dataProgram.account.stakeAccount.fetch(stakeAccount);
        assert.ok(stake.userAddress, builder.publicKey);
        assert.ok(stake.role, role);
        assert.ok(stake.bump, nonce);
    });
    it("validator stake to campaign", async () => {
        let pool = await dataProgram.state.fetch();
        const [stakeAccount, nonce] = await PublicKey.findProgramAddress(
            [
                validator.publicKey.toBuffer(),
                pool.campaigns[0].toBuffer(),
                Buffer.from(anchor.utils.bytes.utf8.encode("staking"))
            ],
            dataProgram.programId
        );
        const userToken = await findAssociatedTokenAddress(
            validator.publicKey,
            pool.mint
        );
        await dataProgram.rpc.stake(
            {
                accounts: {
                    stakeAccount: stakeAccount,
                    user: validator.publicKey,
                    userToken: userToken,
                    cpiState: dataProgram.state.address(),
                    ringfi: dataProgram.programId,
                    campaign: pool.campaigns[0],// selected campaign
                    poolVault: pool.vault,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                },
                signers: [validator],
            });
        const stake = await dataProgram.account.stakeAccount.fetch(stakeAccount);
        assert.ok(stake.status, true);
    }).timeout(20000);

    it("validatorB stake to campaign", async () => {
        let pool = await dataProgram.state.fetch();
        const [stakeAccount, nonce] = await PublicKey.findProgramAddress(
            [
                validatorB.publicKey.toBuffer(),
                pool.campaigns[0].toBuffer(),
                Buffer.from(anchor.utils.bytes.utf8.encode("staking"))
            ],
            dataProgram.programId
        );
        const userToken = await findAssociatedTokenAddress(
            validatorB.publicKey,
            pool.mint
        );
        await dataProgram.rpc.stake(
            {
                accounts: {
                    stakeAccount: stakeAccount,
                    user: validatorB.publicKey,
                    userToken: userToken,
                    cpiState: dataProgram.state.address(),
                    ringfi: dataProgram.programId,
                    campaign: pool.campaigns[0],// selected campaign
                    poolVault: pool.vault,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                },
                signers: [validatorB],
            });
        const stake = await dataProgram.account.stakeAccount.fetch(stakeAccount);
        assert.ok(stake.status, true);
    }).timeout(20000);

    it("validatorC stake to campaign", async () => {
        let pool = await dataProgram.state.fetch();
        const [stakeAccount, nonce] = await PublicKey.findProgramAddress(
            [
                validatorC.publicKey.toBuffer(),
                pool.campaigns[0].toBuffer(),
                Buffer.from(anchor.utils.bytes.utf8.encode("staking"))
            ],
            dataProgram.programId
        );
        const userToken = await findAssociatedTokenAddress(
            validatorC.publicKey,
            pool.mint
        );
        await dataProgram.rpc.stake(
            {
                accounts: {
                    stakeAccount: stakeAccount,
                    user: validatorC.publicKey,
                    userToken: userToken,
                    cpiState: dataProgram.state.address(),
                    ringfi: dataProgram.programId,
                    campaign: pool.campaigns[0],// selected campaign
                    poolVault: pool.vault,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                },
                signers: [validatorC],
            });
        const stake = await dataProgram.account.stakeAccount.fetch(stakeAccount);
        assert.ok(stake.status, true);
    }).timeout(20000);

    it("validate one Sentences", async () => {
        let pool = await dataProgram.state.fetch();

        // Get Stake Account ofd validator A
        const [stakeAccount, nonce] = await PublicKey.findProgramAddress(
            [
                validator.publicKey.toBuffer(),
                pool.campaigns[0].toBuffer(),
                Buffer.from(anchor.utils.bytes.utf8.encode("staking"))
            ],
            dataProgram.programId
        );

        // get stake account of validator B
        const [stakeAccountB, nonceB] = await PublicKey.findProgramAddress(
            [
                validatorB.publicKey.toBuffer(),
                pool.campaigns[0].toBuffer(),
                Buffer.from(anchor.utils.bytes.utf8.encode("staking"))
            ],
            dataProgram.programId
        );

        // get stake account of validator C
        const [stakeAccountC, nonceC] = await PublicKey.findProgramAddress(
            [
                validatorC.publicKey.toBuffer(),
                pool.campaigns[0].toBuffer(),
                Buffer.from(anchor.utils.bytes.utf8.encode("staking"))
            ],
            dataProgram.programId
        );
        const selectCampaign = pool.campaigns[0];
        const campaignData = await dataProgram.account.campaignAccount.fetch(selectCampaign);
        // validate first sentence in first campaign
        const sentenceAccount = campaignData.sentences[0];
        const sentence = await dataProgram.account.sentenceAccount.fetch(sentenceAccount);;
        let textData = new TextDecoder("utf-8").decode(new Uint8Array(sentence.data));
        // check sentence data
        if (textData.startsWith("test sentence number 0")) {
            await dataProgram.rpc.validate(
                true,
                {
                    accounts: {
                        sentenceAccount,
                        stakeAccount,
                        validator: validator.publicKey,
                        campaignAccount: selectCampaign,
                    },
                    signers: [validator]
                }
            );
        }
        await dataProgram.rpc.validate(
            true,
            {
                accounts: {
                    sentenceAccount,
                    stakeAccount:stakeAccountB,
                    validator: validatorB.publicKey,
                    campaignAccount: selectCampaign,
                },
                signers: [validatorB]
            }
        );
        await dataProgram.rpc.validate(
            true,
            {
                accounts: {
                    sentenceAccount,
                    stakeAccount:stakeAccountC,
                    validator: validatorC.publicKey,
                    campaignAccount: selectCampaign,
                },
                signers: [validatorC]
            }
        );

        // validate second sentence
        const sentenceAccount1 = campaignData.sentences[1];
        await dataProgram.rpc.validate(
            true,
            {
                accounts: {
                    sentenceAccount: sentenceAccount1,
                    stakeAccount,
                    validator: validator.publicKey,
                    campaignAccount: selectCampaign,
                },
                signers: [validator]
            }
        );
        await dataProgram.rpc.validate(
            true,
            {
                accounts: {
                    sentenceAccount: sentenceAccount1,
                    stakeAccount:stakeAccountB,
                    validator: validatorB.publicKey,
                    campaignAccount: selectCampaign,
                },
                signers: [validatorB]
            }
        );
        await dataProgram.rpc.validate(
            true,
            {
                accounts: {
                    sentenceAccount: sentenceAccount1,
                    stakeAccount:stakeAccountC,
                    validator: validatorC.publicKey,
                    campaignAccount: selectCampaign,
                },
                signers: [validatorC]
            }
        );

        // validate forth sentence
        const sentenceAccount3 = campaignData.sentences[3];
        await dataProgram.rpc.validate(
            true,
            {
                accounts: {
                    sentenceAccount: sentenceAccount3,
                    stakeAccount:stakeAccount,
                    validator: validator.publicKey,
                    campaignAccount: selectCampaign,
                },
                signers: [validator]
            }
        );

        await dataProgram.rpc.validate(
            true,
            {
                accounts: {
                    sentenceAccount: sentenceAccount3,
                    stakeAccount:stakeAccountB,
                    validator: validatorB.publicKey,
                    campaignAccount: selectCampaign,
                },
                signers: [validatorB]
            }
        );

        await dataProgram.rpc.validate(
            true,
            {
                accounts: {
                    sentenceAccount: sentenceAccount3,
                    stakeAccount:stakeAccountC,
                    validator: validatorC.publicKey,
                    campaignAccount: selectCampaign,
                },
                signers: [validatorC]
            }
        );

    }).timeout(90000);
    it("Get the current status of Ontology", async () => {
        let pool = await dataProgram.state.fetch();
        let selectCampaign = pool.campaigns[0];
        const campaign = await dataProgram.account.campaignAccount.fetch(selectCampaign);
        for (j = 0; j < campaign.head; j++) {
            console.log("\tSentence ", j);
            const sentence = await dataProgram.account.sentenceAccount.fetch(campaign.sentences[j]);
            let test = new TextDecoder("utf-8").decode(new Uint8Array(sentence.data));
            console.log("\tsentence : ", test,
                "\n\tbuilder is ", sentence.builder.toBase58(),
                "\n\tcampaign is ", sentence.campaign.toBase58()
            );
            console.log("\n\tvalidators are ");
            let num_validator = (sentence.correct.toNumber() + sentence.incorrect.toNumber());
            for (k = 0; k < num_validator; k++) {
                console.log("\t\t", sentence.validators[k].toBase58());
            }
            console.log("\n\tvalidation correct :", sentence.correct.toNumber(),
                "\n\tvalidation incorrect :", sentence.incorrect.toNumber(),
                "\n\tvalidation status :", sentence.finish
            );
        }
    }).timeout(90000);
    it("Check finish status of campaign 0 ", async () => {
        let pool = await dataProgram.state.fetch();
        let selectCampaign = pool.campaigns[0];
        const campaign = await dataProgram.account.campaignAccount.fetch(selectCampaign);
        assert.ok(campaign.finish,true);
    });
    it("Architect Claim reward", async () => {
        let pool = await dataProgram.state.fetch();
        const [stakeAccount, nonce] = await PublicKey.findProgramAddress(
            [
                architect.publicKey.toBuffer(),
                campaignAccount.publicKey.toBuffer(),
                Buffer.from(anchor.utils.bytes.utf8.encode("staking"))
            ],
            dataProgram.programId
        );
        const userToken = await findAssociatedTokenAddress(
            architect.publicKey,
            pool.mint
        );
        await dataProgram.rpc.redeemReward(
            {
                accounts: {
                    stakeAccount: stakeAccount,
                    user: architect.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    userToken: userToken,
                    cpiState: dataProgram.state.address(),
                    ringfi: dataProgram.programId,
                    pdaAccount: pda,
                    campaign: campaignAccount.publicKey,
                    poolVault: pool.vault,
                    tokenMint: pool.mint,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                },
            });
        const stake = await dataProgram.account.stakeAccount.fetch(stakeAccount);
    }).timeout(20000);
    it("Validator Claim reward", async () => {
        let pool = await dataProgram.state.fetch();
        const [stakeAccount, nonce] = await PublicKey.findProgramAddress(
            [
                validator.publicKey.toBuffer(),
                campaignAccount.publicKey.toBuffer(),
                Buffer.from(anchor.utils.bytes.utf8.encode("staking"))
            ],
            dataProgram.programId
        );
        const userToken = await findAssociatedTokenAddress(
            validator.publicKey,
            pool.mint
        );
        await dataProgram.rpc.redeemReward(
            {
                accounts: {
                    stakeAccount: stakeAccount,
                    user: validator.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    userToken: userToken,
                    cpiState: dataProgram.state.address(),
                    ringfi: dataProgram.programId,
                    pdaAccount: pda,
                    campaign: campaignAccount.publicKey,
                    poolVault: pool.vault,
                    tokenMint: pool.mint,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                },
            });
        const stake = await dataProgram.account.stakeAccount.fetch(stakeAccount);
    }).timeout(20000);
    it("Architect unstake", async () => {
        let pool = await dataProgram.state.fetch();
        const [stakeAccount, nonce] = await PublicKey.findProgramAddress(
            [
                architect.publicKey.toBuffer(),
                campaignAccount.publicKey.toBuffer(),
                Buffer.from(anchor.utils.bytes.utf8.encode("staking"))
            ],
            dataProgram.programId
        );
        const userToken = await findAssociatedTokenAddress(
            architect.publicKey,
            pool.mint
        );
        await dataProgram.rpc.unstake(
            {
                accounts: {
                    stakeAccount: stakeAccount,
                    user: architect.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    userToken: userToken,
                    cpiState: dataProgram.state.address(),
                    ringfi: dataProgram.programId,
                    pdaAccount: pda,
                    campaign: campaignAccount.publicKey,
                    poolVault: pool.vault,
                    tokenMint: pool.mint,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                },
            });
        const stake = await dataProgram.account.stakeAccount.fetch(stakeAccount);

    }).timeout(20000);

    it("Check pool status", async () => {
        const pool = await dataProgram.state.fetch();
        console.log("\tnumber of campaign ", pool.head.toNumber());
    }).timeout(90000);
    it("Get associated token account", async () => {
        const tokenAccount = await mint.getOrCreateAssociatedAccountInfo(architect.publicKey);
        console.log("\tAssociated accout for architect is", tokenAccount.address.toBase58())
        assert.ok(tokenAccount.owner, architect.publicKey);
    }).timeout(90000);

    it("Airdrop From Smart Contract", async () => {
        const pool = await dataProgram.state.fetch();
        const newTester= anchor.web3.Keypair.generate();
        const tokenAccount = await mint.getOrCreateAssociatedAccountInfo(newTester.publicKey);
        await dataProgram.rpc.airdrop(
            {
                accounts: {
                    userToken :tokenAccount.address,
                    pdaAccount :pda,
                    tokenMint: pool.mint,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                },
            });
    });
});

