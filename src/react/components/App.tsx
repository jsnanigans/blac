import React from 'react'
import logo from '../logo.svg'
import '../App.css'
import Other from "./Other";
import Buttons from "./Buttonts";

function App() {
    return (
        <div className="App">
            <header className="App-header">
                <img src={logo} className="App-logo" alt="logo"/>
                <p>Hello Vite! + React!</p>
                <p>
                    <Other/>
                </p>
                <p>
                    Edit <code>App.tsx</code> and save to test HMR updates.
                    <Other/>
                </p>
                <Buttons/>
            </header>
        </div>
    )
}

export default App
