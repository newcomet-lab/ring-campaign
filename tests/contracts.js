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
const {findAssociatedTokenAddress, getTokenAccountAndAirdrop,hash} = require("./helper");
const splToken = require('@solana/spl-token');
const {createTokenAccount, sleep, getTokenAccount} = require("@project-serum/common");
const {equal} = require("assert");
const TokenInstructions = require("@project-serum/serum").TokenInstructions;

describe('datafarm', () => {
    anchor.setProvider(anchor.Provider.env());
    const provider = anchor.getProvider();
    const data_idl = JSON.parse(
        require('fs')
            .readFileSync('target/idl/Datafarm.json', 'utf8')
            .toString())

    const dataProgram = new anchor.Program(data_idl, data_idl.metadata.address, anchor.getProvider());

    const architect = new anchor.web3.Account(Buffer.from(JSON.parse("[67,248,87,21,143,203,213,213,143,135,249,159,70,37,29,242,60,84,134,6,85,12,162,184,128,146,224,98,8,217,229,253,43,238,68,87,96,38,253,37,215,117,44,163,152,180,130,125,134,125,37,50,213,117,112,119,61,188,223,90,11,234,4,74]")));
    const architectB = new anchor.web3.Account(Buffer.from(JSON.parse("[238,44,213,9,203,44,154,87,151,148,37,224,211,152,14,78,84,218,0,106,129,151,6,138,188,141,106,221,70,195,124,244,70,79,124,28,49,186,13,66,235,220,131,126,42,111,250,196,5,211,100,181,117,76,166,227,212,145,0,239,207,92,161,66]")));
    const builder = new anchor.web3.Account(Buffer.from(JSON.parse("[79,224,231,254,196,98,204,172,7,92,237,50,18,37,79,84,101,165,9,14,152,252,187,46,17,247,122,105,21,230,54,162,171,207,65,208,112,161,12,207,32,55,104,40,0,188,56,81,93,222,144,35,227,7,110,100,80,92,88,151,44,214,137,138]")));
    const validator = new anchor.web3.Account(Buffer.from(JSON.parse("[130,222,253,218,215,178,176,249,205,171,12,121,64,244,106,198,17,112,178,18,225,48,158,224,115,52,141,191,1,83,255,158,205,109,145,142,186,173,38,198,12,92,58,90,138,86,152,183,157,24,5,205,117,150,196,101,78,188,76,231,6,133,131,117]")));
    const validatorB = new anchor.web3.Account(Buffer.from(JSON.parse("[246,98,101,231,100,151,94,250,203,118,85,25,30,229,168,55,97,68,94,98,82,98,15,76,155,195,126,166,252,86,58,199,65,231,3,5,235,196,223,212,245,16,70,215,191,111,107,47,47,9,103,245,254,229,157,119,248,109,37,208,185,29,173,35]")));
    const validatorC = new anchor.web3.Account(Buffer.from(JSON.parse("[196,56,248,6,150,48,86,162,236,23,152,118,212,238,143,191,151,91,28,121,163,3,109,6,62,22,163,74,14,99,243,78,52,177,120,238,72,73,247,143,127,86,147,249,152,86,71,91,217,119,156,201,37,127,24,169,32,160,137,71,253,192,149,61]")));
    let campaignAccount;
    let architectToken;
    let builderToken;
    let validatorToken;
    it("Create Campaign by architect", async () => {
        // await provider.connection.requestAirdrop(architect.publicKey, 10000000000);
        const offChainReference = new anchor.BN(1213);// used by offchain system
        const period = new anchor.BN(14);// number of day for staking
        const min_builder = new anchor.BN(5);// minimum builder needed by this campaign
        const min_validator = new anchor.BN(2);/// minimum validation needed by per utterance
        const reward_per_utterance = new anchor.BN(3); // reward for builder
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
            reward_per_utterance,
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
                    datafarm: dataProgram.programId,
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
    }).timeout(30000);
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
    }).timeout(30000);
   it("Architect stake to campaign", async () => {
       let pool = await dataProgram.state.fetch();
       const [pda,bump] = await anchor.web3.PublicKey.findProgramAddress(
           [Buffer.from(anchor.utils.bytes.utf8.encode("Staking"))],
           dataProgram.programId
       );
       architectToken = await getTokenAccountAndAirdrop(provider,dataProgram,pda, pool.mint, architect.publicKey);
       const [stakeAccount, nonce] = await PublicKey.findProgramAddress(
           [
               architect.publicKey.toBuffer(),
               campaignAccount.publicKey.toBuffer(),
               Buffer.from(anchor.utils.bytes.utf8.encode("staking"))
           ],
           dataProgram.programId
       );
        await dataProgram.rpc.stake(
            {
                accounts: {
                    stakeAccount: stakeAccount,
                    user: architect.publicKey,
                    userToken: architectToken,
                    cpiState: dataProgram.state.address(),
                    datafarm: dataProgram.programId,
                    campaign: campaignAccount.publicKey,
                    poolVault: pool.vault,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                },
                signers: [architect],
            });
        const stake = await dataProgram.account.stakeAccount.fetch(stakeAccount);
        const campaign = await dataProgram.account.campaignAccount.fetch(campaignAccount.publicKey);
        assert.ok(stake.status, true)
        assert.ok(campaign.stakeStatus, true)
    }).timeout(90000);


    it("Create Campaign by architectB", async () => {
        // await provider.connection.requestAirdrop(architectB.publicKey, 3000000000);
        const offChainReference = new anchor.BN(1213);
        const period = new anchor.BN(14);
        const min_builder = new anchor.BN(5);
        const min_validator = new anchor.BN(5);
        const reward_per_utterance = new anchor.BN(3);
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
            reward_per_utterance,
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
                    datafarm: dataProgram.programId,
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
        // await provider.connection.requestAirdrop(builder.publicKey, 3000000000);
        await sleep(1000);
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
    }).timeout(30000);
    it("builder stake to campaign", async () => {
        // await provider.connection.requestAirdrop(builder.publicKey, 3000000000);
        await sleep(1000);
        let pool = await dataProgram.state.fetch();
        const [pda,bump] = await anchor.web3.PublicKey.findProgramAddress(
            [Buffer.from(anchor.utils.bytes.utf8.encode("Staking"))],
            dataProgram.programId
        );
        builderToken =await getTokenAccountAndAirdrop(provider,dataProgram,pda, pool.mint, builder.publicKey);
        const [stakeAccount, nonce] = await PublicKey.findProgramAddress(
            [
                builder.publicKey.toBuffer(),
                pool.campaigns[0].toBuffer(),
                Buffer.from(anchor.utils.bytes.utf8.encode("staking"))
            ],
            dataProgram.programId
        );
        await dataProgram.rpc.stake(
            {
                accounts: {
                    stakeAccount: stakeAccount,
                    user: builder.publicKey,
                    userToken: builderToken,
                    cpiState: dataProgram.state.address(),
                    datafarm: dataProgram.programId,
                    campaign: pool.campaigns[0],// selected campaign
                    poolVault: pool.vault,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                },
                signers: [builder],
            });
        const stake = await dataProgram.account.stakeAccount.fetch(stakeAccount);
        assert.ok(stake.status, true);
    }).timeout(30000);

    it("Submit 3 Utterance to an ontology", async () => {
        let utterance = "test utterance number ";
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
            let msg = utterance+ i ;//
            const selectCampaign = pool.campaigns[0];
            const utteranceAccount= anchor.web3.Keypair.generate();
            const transaction = await dataProgram.rpc.submitUtterance(
                msg,
                {
                    accounts: {
                        utteranceAccount:utteranceAccount.publicKey,
                        builder: builder.publicKey,
                        campaignAccount: selectCampaign,
                        stakeAccount:stakeAccount,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    },
                    instructions: [
                        await dataProgram.account.utteranceAccount.createInstruction(utteranceAccount),
                    ],
                    signers: [builder,utteranceAccount]
                }
            );
        }

        const campaignData = await dataProgram.account.campaignAccount.fetch(pool.campaigns[0]);
        console.log("\thead is ", campaignData.head.toNumber());
        //assert.ok(campaignData.head.toNumber() === 6);
    }).timeout(90000);

    it("Init Stake Account for validator", async () => {
        // await provider.connection.requestAirdrop(validator.publicKey, 3000000000);
        await sleep(2000);
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
    }).timeout(90000);
    it("Init Stake Account for validatorB", async () => {
        // await provider.connection.requestAirdrop(validatorB.publicKey, 3000000000);
        await sleep(2000);
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
    }).timeout(90000);
    it("Init Stake Account for validatorC", async () => {
        // await provider.connection.requestAirdrop(validatorC.publicKey, 3000000000);
        await sleep(2000);
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
    }).timeout(90000);
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
        const [pda,bump] = await anchor.web3.PublicKey.findProgramAddress(
            [Buffer.from(anchor.utils.bytes.utf8.encode("Staking"))],
            dataProgram.programId
        );
        validatorToken =await getTokenAccountAndAirdrop(provider,dataProgram,pda, pool.mint, validator.publicKey);
        await dataProgram.rpc.stake(
            {
                accounts: {
                    stakeAccount: stakeAccount,
                    user: validator.publicKey,
                    userToken: validatorToken,
                    cpiState: dataProgram.state.address(),
                    datafarm: dataProgram.programId,
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
        const [pda,bump] = await anchor.web3.PublicKey.findProgramAddress(
            [Buffer.from(anchor.utils.bytes.utf8.encode("Staking"))],
            dataProgram.programId
        );
        const userToken =await getTokenAccountAndAirdrop(provider,dataProgram,pda, pool.mint, validatorB.publicKey);
        await dataProgram.rpc.stake(
            {
                accounts: {
                    stakeAccount: stakeAccount,
                    user: validatorB.publicKey,
                    userToken: userToken,
                    cpiState: dataProgram.state.address(),
                    datafarm: dataProgram.programId,
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
        const [pda,bump] = await anchor.web3.PublicKey.findProgramAddress(
            [Buffer.from(anchor.utils.bytes.utf8.encode("Staking"))],
            dataProgram.programId
        );
        const userToken =await getTokenAccountAndAirdrop(provider,dataProgram,pda, pool.mint, validatorC.publicKey);
        await dataProgram.rpc.stake(
            {
                accounts: {
                    stakeAccount: stakeAccount,
                    user: validatorC.publicKey,
                    userToken: userToken,
                    cpiState: dataProgram.state.address(),
                    datafarm: dataProgram.programId,
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

    it("validate one Utterances", async () => {
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
        // validate first utterance in first campaign
        const utteranceAccount = campaignData.utterances[0];
        const utterance = await dataProgram.account.utteranceAccount.fetch(utteranceAccount);;
        let textData = new TextDecoder("utf-8").decode(new Uint8Array(utterance.data));
        // check utterance data
        if (textData.startsWith("test utterance number 0")) {
            await dataProgram.rpc.validate(
                true,
                {
                    accounts: {
                        utteranceAccount,
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
                    utteranceAccount,
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
                    utteranceAccount,
                    stakeAccount:stakeAccountC,
                    validator: validatorC.publicKey,
                    campaignAccount: selectCampaign,
                },
                signers: [validatorC]
            }
        );

        // validate second utterance
        const utteranceAccount1 = campaignData.utterances[1];
        await dataProgram.rpc.validate(
            true,
            {
                accounts: {
                    utteranceAccount: utteranceAccount1,
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
                    utteranceAccount: utteranceAccount1,
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
                    utteranceAccount: utteranceAccount1,
                    stakeAccount:stakeAccountC,
                    validator: validatorC.publicKey,
                    campaignAccount: selectCampaign,
                },
                signers: [validatorC]
            }
        );

        // validate forth utterance
        const utteranceAccount3 = campaignData.utterances[3];
        await dataProgram.rpc.validate(
            true,
            {
                accounts: {
                    utteranceAccount: utteranceAccount3,
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
                    utteranceAccount: utteranceAccount3,
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
                    utteranceAccount: utteranceAccount3,
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
            console.log("\tUtterance ", j);
            const utterance = await dataProgram.account.utteranceAccount.fetch(campaign.utterances[j]);
            let test = new TextDecoder("utf-8").decode(new Uint8Array(utterance.data));
            console.log("\tutterance : ", test,
                "\n\tbuilder is ", utterance.builder.toBase58(),
                "\n\tcampaign is ", utterance.campaign.toBase58()
            );
            console.log("\n\tvalidators are ");
            let num_validator = (utterance.correct.toNumber() + utterance.incorrect.toNumber());
            for (k = 0; k < num_validator; k++) {
                console.log("\t\t", utterance.validators[k].toBase58());
            }
            console.log("\n\tvalidation correct :", utterance.correct.toNumber(),
                "\n\tvalidation incorrect :", utterance.incorrect.toNumber(),
                "\n\tvalidation status :", utterance.finish
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
        const [pda,bump] = await anchor.web3.PublicKey.findProgramAddress(
            [Buffer.from(anchor.utils.bytes.utf8.encode("Staking"))],
            dataProgram.programId
        );

        await dataProgram.rpc.redeemReward(
            {
                accounts: {
                    stakeAccount,
                    user: architect.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    userToken :architectToken,
                    cpiState: dataProgram.state.address(),
                    datafarm: dataProgram.programId,
                    pdaAccount: pda,
                    campaign: campaignAccount.publicKey,
                    poolVault: pool.vault,
                    tokenMint: pool.mint,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                },
                signers:[architect]
            });
        const stake = await dataProgram.account.stakeAccount.fetch(stakeAccount);
    }).timeout(50000);
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
        const [pda,bump] = await anchor.web3.PublicKey.findProgramAddress(
            [Buffer.from(anchor.utils.bytes.utf8.encode("Staking"))],
            dataProgram.programId
        );
        await dataProgram.rpc.redeemReward(
            {
                accounts: {
                    stakeAccount: stakeAccount,
                    user: validator.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    userToken: validatorToken,
                    cpiState: dataProgram.state.address(),
                    datafarm: dataProgram.programId,
                    pdaAccount: pda,
                    campaign: pool.campaigns[0],
                    poolVault: pool.vault,
                    tokenMint: pool.mint,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                },
                signers:[validator]
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
        let [pda,bump] = await anchor.web3.PublicKey.findProgramAddress(
            [Buffer.from(anchor.utils.bytes.utf8.encode("Staking"))],
            dataProgram.programId
        );
        await dataProgram.rpc.unstake(
            {
                accounts: {
                    stakeAccount: stakeAccount,
                    user: architect.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    userToken: architectToken,
                    cpiState: dataProgram.state.address(),
                    datafarm: dataProgram.programId,
                    pdaAccount: pda,
                    campaign: campaignAccount.publicKey,
                    poolVault: pool.vault,
                    tokenMint: pool.mint,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                },
                signers:[architect]
            });
        const stake = await dataProgram.account.stakeAccount.fetch(stakeAccount);

    }).timeout(20000);

    it("Check pool status", async () => {
        const pool = await dataProgram.state.fetch();
        console.log("\tnumber of campaign ", pool.head.toNumber());
    }).timeout(90000);
    it("Get associated token account", async () => {
        const pool = await dataProgram.state.fetch();
        const tokenAccount = await findAssociatedTokenAddress(
            architect.publicKey,
            pool.mint
        );
        console.log("\tAssociated accout for architect is", tokenAccount.toBase58())
    }).timeout(90000);

    it("Airdrop From Smart Contract", async () => {
        const pool = await dataProgram.state.fetch();
        const newTester= anchor.web3.Keypair.generate();
        const [pda,bump] = await anchor.web3.PublicKey.findProgramAddress(
            [Buffer.from(anchor.utils.bytes.utf8.encode("Staking"))],
            dataProgram.programId
        );
        const tokenAccount =await getTokenAccountAndAirdrop(provider,dataProgram,pda, pool.mint, newTester.publicKey);
        await dataProgram.rpc.airdrop(
            {
                accounts: {
                    userToken :tokenAccount,
                    pdaAccount :pda,
                    tokenMint: pool.mint,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                },
            });
    }).timeout(90000);

    it("Freeze account From Smart Contract", async () => {
        const pool = await dataProgram.state.fetch();
        const newTester= anchor.web3.Keypair.generate();
        const tokenAccount = await createTokenAccount(anchor.getProvider(),pool.mint,newTester.publicKey);
        const [pda,bump] = await anchor.web3.PublicKey.findProgramAddress(
            [Buffer.from(anchor.utils.bytes.utf8.encode("Staking"))],
            dataProgram.programId
        );
        const userToken =await getTokenAccountAndAirdrop(provider,dataProgram,pda, pool.mint, architect.publicKey);
        await dataProgram.rpc.freeze(
            {
                accounts: {
                    userToken :userToken,
                    pdaAccount :pda,
                    tokenMint: pool.mint,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                },
            });
        await sleep(500);
        const UserTokenData = await  getTokenAccount(provider,userToken);
        assert.ok(UserTokenData.isFrozen, true);
        await dataProgram.rpc.thaw(
            {
                accounts: {
                    userToken :userToken,
                    pdaAccount :pda,
                    tokenMint: pool.mint,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                },
            });
        await sleep(500);
        const checkUserTokenData = await  getTokenAccount(provider,userToken);
        assert.equal(checkUserTokenData.isFrozen,false);
    }).timeout(90000);

});

