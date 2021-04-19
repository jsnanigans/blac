import React from 'react'
import ReactDOM from 'react-dom'
import App from './components/App'
import {GlobalBlocProvider} from './state';

ReactDOM.render(
  // <React.StrictMode>
      <GlobalBlocProvider>
          <App />
      </GlobalBlocProvider>,
  // </React.StrictMode>,
  document.getElementById('root')
)
