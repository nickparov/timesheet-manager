const path = require("path");

module.exports = {
    mode: "development",
    devtool: "inline-source-map",
    devServer: {
        static: "./dev",
    },
    entry: path.join(__dirname, "react", "index.js"),
    output: {
        path: path.resolve(__dirname, "dev"),
        filename: "main.bundle.js",
        publicPath: "/",
    },
    module: {
        rules: [
            {
                test: /\.?js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["@babel/preset-env", "@babel/preset-react"],
                    },
                },
            },
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"],
            },
        ],
    },
};
