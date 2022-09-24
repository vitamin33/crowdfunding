import './App.css';
import {useEffect, useState} from "react";
import {PhantomWalletAdapter} from "@solana/wallet-adapter-phantom";
import {WalletReadyState} from "@solana/wallet-adapter-base";
import idl from "./idl.json"
import {clusterApiUrl, Connection, PublicKey} from "@solana/web3.js";
import {AnchorProvider, BN, Program, utils, web3} from "@project-serum/anchor";
import {Buffer} from "buffer"

window.Buffer = Buffer

const programId = new PublicKey(idl.metadata.address)
const network = clusterApiUrl("devnet")
const opts = {
    preflightCommitment: "processed"
}
const {SystemProgram} = web3;

const App = () => {
    const [walletAddress, setWalletAddress] = useState(null)
    const [campaigns, setCampaigns] = useState([])
    const adapter = new PhantomWalletAdapter()
    const getProvider = () => {
        const connection = new Connection(network, opts.preflightCommitment)
        return new AnchorProvider(connection, window.solana, opts.preflightCommitment)
    }

    const checkIfWalletIsConnected = async () => {
        try {
            const solana = window;
            if (solana) {
                if (adapter.readyState.valueOf() === WalletReadyState.Installed.valueOf()) {
                    const response = await solana.connect({
                        onlyIfTrusted: true
                    })
                    console.log("Connect with public key: ", response.publicKey.toString())

                    setWalletAddress(response.publicKey.toString())
                }
            } else {
                alert("Solana wallet not found! Please install Phantom wallet.")
            }
        } catch (e) {
            console.log(e);
        }
    }

    const connectWallet = async () => {
        await adapter.connect()
        setWalletAddress(adapter.publicKey.toString())

        console.log('Connected to Phantom wallet: ', adapter.connected, adapter.publicKey.toString())
    }

    const getCampaigns = async () => {
        const connection = new Connection(network, opts.preflightCommitment)
        const provider = getProvider()
        const program = new Program(idl, programId, provider)

        Promise.all((await connection.getProgramAccounts(programId)).map(
            async (campaign) => ({
                ...(await program.account.campaign.fetch(campaign.pubkey)),
                pubkey: campaign.pubkey
            })
        )).then((campaigns) => setCampaigns(campaigns))
    }

    const donate = async (publicKey) => {
        try {
            const provider = getProvider()
            const program = new Program(idl, programId, provider)
            await program.rpc.donate(new BN(0.2 * web3.LAMPORTS_PER_SOL), {
                accounts: {
                    campaign: publicKey,
                    user: provider.wallet.publicKey,
                    systemProgram: SystemProgram.programId
                }
            })
            console.log("Donated money to campaign: ", publicKey.toString())
            await getCampaigns()
        } catch (e) {
            console.log(e)
        }
    }

    const withdraw = async (publicKey) => {
        try {
            const provider = getProvider()
            const program = new Program(idl, programId, provider)
            await program.rpc.withdraw(new BN(0.2 * web3.LAMPORTS_PER_SOL), {
                accounts: {
                    campaign: publicKey,
                    user: provider.wallet.publicKey,
                }
            })
            console.log("Withdraw money from campaign: ", publicKey.toString())
            await getCampaigns()
        } catch (e) {
            console.log(e)
        }
    }

    const createCampaign = async () => {
        try {
            const provider = getProvider()
            const program = new Program(idl, programId, provider)
            const [campaign] = await PublicKey.findProgramAddress(
                [utils.bytes.utf8.encode("CAMPAIGN_DEMO"),
                    provider.wallet.publicKey.toBuffer()
                ],
                programId
            )
            await program.rpc.create('Miles Away campaign', 'Collect money for Miles Away',
                {
                    accounts: {
                        campaign,
                        user: provider.wallet.publicKey,
                        systemProgram: SystemProgram.programId
                    }
                })
            console.log(
                "Created a new campaign w/ address:",
                campaign.toString()
            )
        } catch (e) {
            console.log("Error creating campaign: ", e)
        }
    }

    const renderNotConnectedContainer = () => {
        return <button onClick={connectWallet}>Connect to wallet</button>
    }
    const renderConnectedContainer = () => {
        return <>
            <button onClick={createCampaign}>Create campaign</button>
            <button onClick={getCampaigns}>Get list of campaigns</button>
            <br/>
            {campaigns.map(campaign => (<>
                    <p>Campaign ID: {campaign.pubkey.toString()}</p>
                    <p>Balance: {(campaign.amountDonated / web3.LAMPORTS_PER_SOL).toString()}</p>
                    <p>Campaign name: {campaign.name}</p>
                    <p>Campaign description: {campaign.description}</p>
                    <button onClick={() => donate(campaign.pubkey)}>Click to donate!</button>
                    <button onClick={() => withdraw(campaign.pubkey)}>Withdraw</button>
                    <br/>
                </>)
            )}
        </>
    }

    useEffect(() => {
        const onLoad = async () => {
            await checkIfWalletIsConnected();
        };
        window.addEventListener('load', onLoad);
        return () => window.removeEventListener('load', onLoad);
    }, []);
    return <div className="App">
        {!walletAddress && renderNotConnectedContainer()}
        {walletAddress && renderConnectedContainer()}
    </div>
}

function ready() {
    return typeof window !== 'undefined' && !!window.solana?.isPhantom;
}

export default App;
