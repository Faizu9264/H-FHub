const Orders = require('../models/Order')


// const findIncome = async(startDate = new Date('1990-01-01'), endDate = new Date()) => {
//     try {
//         console.log(startDate, endDate);

//         const ordersData = await Orders.find(
//             {
//                 status: 'Delivered',
//                 createdAt: {
//                     $gte: startDate,
//                     $lt: endDate 
//                 }
//             }
//         )

//         let totalIncome = 0;
//         // for( const order of ordersData){
//         //     for(const pdt of order.products){
//         //         if(pdt.status === 'Delivered'){
//         //             totalIncome += parseInt(pdt.totalPrice)
//         //         }
//         //     }
//         // }
//         for (const order of ordersData) {
//             for (const pdt of order.products) {
//                 console.log('Product:', pdt.productName, 'Status:', pdt.status, 'Total Price:', pdt.totalPrice);
//                 if (pdt.status === 'Delivered') {
//                     totalIncome += parseInt(pdt.totalPrice, 10);
//                 }
//             }
//         }
//         console.log('Total Income:', totalIncome);
        
//         console.log("totalIncome",formatNum(totalIncome));
//         return formatNum(totalIncome)

//     } catch (error) {
//         throw error
//     }
// }

const findIncome = async (startDate = new Date('1990-01-01'), endDate = new Date()) => {
    try {
        console.log(startDate, endDate);

        const ordersData = await Orders.find(
            {
                status: 'Delivered',
                createdAt: {
                    $gte: startDate,
                    $lt: endDate
                }
            }
        );

        let totalIncome = 0;

        for (const order of ordersData) {
            if (order.status === 'Delivered') { // Check if the order is delivered
                for (const pdt of order.products) {
                    console.log('Product:', pdt.productName, 'Status:', pdt.status, 'Total Price:', pdt.totalPrice);
                    totalIncome += parseInt(pdt.totalPrice);
                }
            }
        }
        
        console.log('Total Income:', totalIncome);
        return formatNum(totalIncome);

    } catch (error) {
        throw error;
    }
};


// const countSales = async(startDate = new Date('1990-01-01'), endDate = new Date()) => {
//     try {
//         const ordersData = await Orders.find(
//             { 
//                 status: 'Delivered', 
//                 createdAt:{ 
//                     $gte: startDate, 
//                     $lt: endDate 
//                 } 
//             }
//         )
//         console.log("Orders",ordersData);
//         let salesCount = 0;
//         for( const order of ordersData){
//             for(const pdt of order.products){
//                 if(pdt.status === 'Delivered'){
//                     salesCount += pdt.quantity;
//                 }
//             }
//         }
//        console.log("salesCount",salesCount);
//         return salesCount;

//     } catch (error) {
//         throw error
//     }
// }

const countSales = async (startDate = new Date('1990-01-01'), endDate = new Date()) => {
    try {
        const salesCountData = await Orders.aggregate([
            {
                $match: {
                    status: 'Delivered',
                    createdAt: {
                        $gte: startDate,
                        $lt: endDate,
                    },
                },
            },
            {
                $unwind: '$products',
            },
            {
                $group: {
                    _id: null,
                    salesCount: {
                        $sum: '$products.quantity',
                    },
                },
            },
        ]);
        console.log("salesCountData",salesCountData);
        if (salesCountData.length > 0) {
            return salesCountData[0].salesCount;
        } else {
            return 0;
        }
    } catch (error) {
        throw error;
    }
};


// const findSalesData = async(startDate = new Date('1990-01-01'), endDate = new Date()) => {
//     try {
//         const pipeline = [
//             {
//                 $match: {
//                     status: 'Delivered',
//                     date: {
//                         $gte: startDate,
//                         $lt: endDate
//                     }
//                 }
//             },
//             {
//                 $group:{
//                     _id: { createdAt: { $dateToString: { format: '%Y', date: '$createdAt'}}},
//                     sales: { $sum: '$totalPrice' }
//                 }
//             },
//             {
//                 $sort: { '_id.createdAt' : 1 }
//             }
//         ]

//         const orderData = await Orders.aggregate(pipeline)
//         console.log("orderData",orderData);
//         return orderData

//     } catch (error) {
//         throw error
//     }
// }

const findSalesData = async (startDate = new Date('1990-01-01'), endDate = new Date()) => {
    try {
        const pipeline = [
            {
                $match: {
                    status: 'Delivered',
                    createdAt: {
                        $gte: startDate,
                        $lt: endDate,
                    },
                },
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },  // Extract the year from the createdAt field
                    },
                    sales: { $sum: '$totalPrice' },
                },
            },
            {
                $sort: { '_id.year': 1 },  // Sort by year in ascending order
            },
        ];

        const orderData = await Orders.aggregate(pipeline);
        console.log("orderData", orderData);
        return orderData;
    } catch (error) {
        throw error;
    }
};


// const findSalesDataOfYear = async(year) => {
//     try {
        
//         const pipeline = [
//             {
//                 $match: {
//                     status: 'Delivered',
//                     date: {
//                         $gte: new Date(`${year}-01-01`),
//                         $lt: new Date(`${year + 1}-01-01`)
//                     }
//                 }
//             },
//             {
//                 $group:{
//                     _id: { createdAt: { $dateToString: { format: '%m', date: '$createdAt'}}},
//                     sales: { $sum: '$totalPrice' }
//                 }
//             },
//             {
//                 $sort: { '_id.createdAt' : 1 }
//             }
//         ]

//         const orderData = await Orders.aggregate(pipeline)
//         return orderData

//     } catch (error) {
//         throw error
//     }
// }

const findSalesDataOfYear = async (year) => {
    try {
        const pipeline = [
            {
                $match: {
                    status: 'Delivered',
                    createdAt: {
                        $gte: new Date(`${year}-01-01`),
                        $lt: new Date(`${year + 1}-01-01`)
                    }
                }
            },
            {
                $group: {
                    _id: { createdAt: { $dateToString: { format: '%m', date: '$createdAt' } } },
                    sales: { $sum: '$totalPrice' }
                }
            },
            {
                $sort: { '_id.createdAt': 1 }
            }
        ];

        const orderData = await Orders.aggregate(pipeline);
        return orderData;
    } catch (error) {
        throw error;
    }
};

// const findSalesDataOfMonth = async(year, month) => {
//     try {

//         const firstDayOfMonth = new Date(year, month - 1, 1);
//         const lastDayOfMonth = new Date(year, month, 0);
//        console.log("firstDayOfMonth:",firstDayOfMonth,"lastDayOfMonth:",lastDayOfMonth);
//         const pipeline = [
//             {
//                 $match: {
//                     status: 'Delivered',
//                     date: {
//                         $gte: firstDayOfMonth,
//                         $lt: lastDayOfMonth
//                     }
//                 }
//             },
//             {
//                 $addFields: {
//                     weekNumber: {
//                         $ceil: {
//                             $divide: [
//                                 { $subtract: ["$createdAt", firstDayOfMonth] },
//                                 604800000 // milliseconds in a week (7 days)
//                             ]
//                         }
//                     }
//                 }
//             },
//             {
//                 $group: {
//                     _id: { createdAt: "$weekNumber" }, // Group by week number
//                     sales: { $sum: '$totalPrice' }
//                 }
//             },
//             { $sort: { '_id.createdAt': 1 } }
//         ]

//         const orderData = await Orders.aggregate(pipeline)
//         console.log("orderData",orderData);
//         return orderData

//     } catch (error) {
//         throw error
//     }
// }
const findSalesDataOfMonth = async (year, month) => {
    try {
        const firstDayOfMonth = new Date(year, month - 1, 1);
        const lastDayOfMonth = new Date(year, month, 0);

        const pipeline = [
            {
                $match: {
                    status: 'Delivered',
                    createdAt: {
                        $gte: firstDayOfMonth,
                        $lt: lastDayOfMonth
                    }
                }
            },
            {
                $addFields: {
                    weekNumber: {
                        $ceil: {
                            $divide: [
                                { $subtract: ['$createdAt', firstDayOfMonth] },
                                604800000 // milliseconds in a week (7 days)
                            ]
                        }
                    }
                }
            },
            {
                $group: {
                    _id: { createdAt: '$weekNumber' }, // Group by week number
                    sales: { $sum: '$totalPrice' }
                }
            },
            { $sort: { '_id.createdAt': 1 } }
        ];

        const orderData = await Orders.aggregate(pipeline);
        return orderData;
    } catch (error) {
        throw error;
    }
};


const  formatNum = (num) => {
    if (num >= 10000000) {
        return (num / 10000000).toFixed(2) + ' Cr';
    } else if (num >= 100000) {
        return (num / 100000).toFixed(2) + ' L';
    } else if(num >= 1000){
        return (num / 1000).toFixed(2) + ' K '
    } else {
        return num.toString();
    }
}

module.exports = {
    formatNum,
    findIncome,
    countSales,
    findSalesData,
    findSalesDataOfYear,
    findSalesDataOfMonth
}