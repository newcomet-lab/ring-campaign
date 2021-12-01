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

describe('datafarm', () => {
    anchor.setProvider(anchor.Provider.env());
    const provider = anchor.getProvider();
    const data_idl = JSON.parse(
        require('fs')
            .readFileSync('target/idl/Datafarm.json', 'utf8')
            .toString())

    const dataProgram = new anchor.Program(data_idl, data_idl.metadata.address, anchor.getProvider());

    const tester = new anchor.web3.PublicKey("FGrfSpb4mHxRAsmj8jsPuDibiwkmaL1CcWeHFHyt2cXJ");
    const tester2 = new anchor.web3.PublicKey("GEVkD15abk9Yvy4zhJaNs5sFJmgD8oaAFASvj9oz6Scn");
    const tester3 = new anchor.web3.PublicKey("64BDoRi8Cor1iKmKpPuGR9x4hE5sbsohtbiBsbDnzyqy");
    const tester4 = new anchor.web3.PublicKey("DgBxsrQiXpDT9EYeqUeyWBbrjWEmxwZveygVDziNwxSs");
    const tester5 = new anchor.web3.PublicKey("8WQL2yB5yw9myW7Xo34sZ7eUTU2oME83BFi6Xa7Wwm1V");


    const user = os.userInfo().username;
    const key_path = "/home/"+user+"/.config/solana/id.json";
    const ks_hadi = fs.readFileSync(key_path, {encoding: 'utf8'});
    const kb_hadi = Buffer.from(JSON.parse(ks_hadi));
    let hadi = new anchor.web3.Account(kb_hadi);

    const admin = anchor.web3.Keypair.generate();
    const customer = anchor.web3.Keypair.generate();
    const architect = anchor.web3.Keypair.generate();
    const architectB = anchor.web3.Keypair.generate();
    const builder = anchor.web3.Keypair.generate();
    const validator = anchor.web3.Keypair.generate();
    const validatorB = anchor.web3.Keypair.generate();
    const validatorC = anchor.web3.Keypair.generate();
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
        console.log("\thadi: ", hadi.publicKey.toBase58());
        console.log("\tadmin : ", admin.publicKey.toBase58());
        console.log("\tarchitect : ", architect.publicKey.toBase58());
        console.log("\tbuilder : ", builder.publicKey.toBase58());
        console.log("\tvalidator : ", validator.publicKey.toBase58());
        console.log("\tcustomer : ", customer.publicKey.toBase58());
        assert.ok(true);
    }).timeout(90000);
    it("Airdrop SNS token to users", async () => {
        mint = await splToken.Token.createMint(provider.connection, hadi, hadi.publicKey, null, 9, splToken.TOKEN_PROGRAM_ID,)
        console.log('\tSNS Token public address: ' + mint.publicKey.toBase58());
        architectToken = await userCharge(mint, architect, hadi);
        architectBToken = await userCharge(mint, architectB, hadi);
        builderToken = await userCharge(mint, builder, hadi);
        validatorToken = await vaultCharge(mint, validator, hadi);
        validatorBToken = await vaultCharge(mint, validatorB, hadi);
        validatorCToken = await vaultCharge(mint, validatorC, hadi);
        //await ourCharge(mint, david, admin);
        await ourCharge(mint, tester, hadi);
        await ourCharge(mint, tester2, hadi);
        await ourCharge(mint, tester3, hadi);
        await ourCharge(mint, tester4, hadi);
        await ourCharge(mint, tester5, hadi);
        const [_pda, _nonce] = await anchor.web3.PublicKey.findProgramAddress(
            [Buffer.from(anchor.utils.bytes.utf8.encode("Staking"))],
            dataProgram.programId
        );
        pda = _pda;
        // Mint more token to vault because we going to send reward to users
        pool_vault = await vaultCharge(mint, hadi, hadi);
        console.log("\tarchitect have ", architectToken.amount / 1000000000, " SNS");
        console.log("\tbuilder have ", builderToken.amount / 1000000000, " SNS");
        console.log("\tvalidator have ", validatorToken.amount / 1000000000, " SNS");
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
                    authority: hadi.publicKey,
                    mint: mint.publicKey,
                    vault: pool_vault.address,
                    stakingProgram: dataProgram.programId,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                },
                signers: [hadi]
            });
        let pool = await dataProgram.state.fetch();
        const change_vault = await mint.getAccountInfo(pool.vault);
        assert.ok(change_vault.owner, pda);
    }).timeout(90000);

    it("Create Campaign by architect", async () => {
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
                    datafarm: dataProgram.programId,
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
    }).timeout(20000);

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
/*        const campaignAddr = await dataProgram.account.campaignAccount.associatedAddress(pool.campaigns[0]);
        console.log("\t", campaignData.head.toString(), " utterances submited to campaign : ", campaignAddr.toBase58());
        let utter = new TextDecoder("utf-8").decode(new Uint8Array(campaignData.utterances[0].data));
        for (j = 0; j < campaignData.head; j++) {
            let test = new TextDecoder("utf-8").decode(new Uint8Array(campaignData.utterances[j].data));
            console.log("\tutterance : ", test,
                " submitted by ", campaignData.utterances[j].builder.toBase58(),
                "\n\tvalidation correct :", campaignData.utterances[j].correct.toNumber(),
                "\n\tvalidation incorrect :", campaignData.utterances[j].incorrect.toNumber(),
                "\n\t and validation status :", campaignData.utterances[j].finish
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
                    datafarm: dataProgram.programId,
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
                    datafarm: dataProgram.programId,
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
                    datafarm: dataProgram.programId,
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


});

