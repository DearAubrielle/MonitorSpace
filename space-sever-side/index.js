const express = require("express");
const cors = require("cors");
const app = express();
const port = 8080;
const usersRoutes = require("./routes/users");
const floorplansRoutes = require("./routes/floorplans");
const path = require("path");

const corsOptions = {
  origin: ["http://localhost:5173"],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));


// Mount routes
app.use("/api/users", usersRoutes);
app.use("/api/floorplans", floorplansRoutes);
app.use('/private_uploads', express.static(path.join(__dirname, 'private_uploads')));

app.listen(port, () => {
  console.log(`Server started on port ${port} index.js at http://localhost:${port} jaaaaaaaZz`);
});




/* 
function asyncOperation() {

    let counter = 0;

    return function() {

        counter += 1;

        console.log(`Operation called ${counter} times`);

    };

}

const operation = asyncOperation();

operation(); // Output: Operation called 1 times

operation(); // Output: Operation called 2 times

(function() {
    let localVariable = 'I am private';
    console.log(localVariable);
})();
console.log(typeof localVariable); */