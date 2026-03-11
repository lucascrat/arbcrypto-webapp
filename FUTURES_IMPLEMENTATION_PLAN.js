
// Update in useAppStore.js
// Add these actions to the store:

/*
    setTradingType: (type) => set({ tradingType: type }),
    
    setFuturesConfig: async (symbol, leverage, marginType) => {
        try {
            await binanceService.setLeverage(symbol, leverage);
            await binanceService.setMarginType(symbol, marginType);
            set(state => ({
                futuresState: {
                    ...state.futuresState,
                    leverage,
                    marginType
                }
            }));
            return true;
        } catch (e) {
            console.error('Futures config error', e);
            return false;
        }
    },
    
    fetchFuturesPositions: async () => {
        try {
            const info = await binanceService.getFuturesAccountInfo();
            const riskyPositions = await binanceService.getFuturesPositionRisk();
            
            // Filter only active positions
            const activePositions = riskyPositions.filter(p => parseFloat(p.positionAmt) !== 0);
            
            set(state => ({
                futuresState: {
                    ...state.futuresState,
                    totalWalletBalance: parseFloat(info.totalWalletBalance),
                    totalUnrealizedProfit: parseFloat(info.totalUnrealizedProfit),
                    positions: activePositions
                }
            }));
        } catch (e) {
            console.error('Error fetching futures data', e);
        }
    }
*/
