import ReactDOM from 'react-dom';
import App from './App';
import './index.css';
import './App.scss';

import { configureStore } from '@reduxjs/toolkit';
import voterData from './store/voterData';
import { Provider } from 'react-redux';

const store = configureStore({
    reducer: {
        voterData,
    },
});

ReactDOM.render(
    <Provider store={store}>
        <App />
    </Provider>,
    document.getElementById('root')
);
