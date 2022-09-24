import './App.css';
import {useEffect, useState} from "react";
import {PhantomWalletAdapter} from "@solana/wallet-adapter-phantom";
import {WalletReadyState} from "@solana/wallet-adapter-base";


const App = () => {
    const [walletAddress, setWalletAddress] = useState(null)
    const adapter = new PhantomWalletAdapter()

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

    const renderNotConnectedContainer = () => {
        return <button onClick={connectWallet}>Connect to wallet</button>
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
    </div>
}

function ready() {
    return typeof window !== 'undefined' && !!window.solana?.isPhantom;
}

export default App;
