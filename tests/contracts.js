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

    const architect = anchor.web3.Keypair.generate();
    const architectB = anchor.web3.Keypair.generate();
    const builder = anchor.web3.Keypair.generate();
    const validator = anchor.web3.Keypair.generate();
    const validatorB = anchor.web3.Keypair.generate();
    const validatorC = anchor.web3.Keypair.generate();
    let campaignAccount;
    let architectToken;
    let builderToken;
    let validatorToken;
    it("Create Campaign by architect", async () => {
        await provider.connection.requestAirdrop(architect.publicKey, 10000000000);
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
        await provider.connection.requestAirdrop(architectB.publicKey, 3000000000);
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
        await provider.connection.requestAirdrop(builder.publicKey, 3000000000);
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
        await provider.connection.requestAirdrop(builder.publicKey, 3000000000);
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
        await provider.connection.requestAirdrop(validator.publicKey, 3000000000);
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
        await provider.connection.requestAirdrop(validatorB.publicKey, 3000000000);
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
        await provider.connection.requestAirdrop(validatorC.publicKey, 3000000000);
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

