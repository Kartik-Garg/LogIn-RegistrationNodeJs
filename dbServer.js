//importing express lib 
const express = require("express")
const app = express()

//connecting to mySQL
const mysql = require("mysql")
//const { CLIENT_LONG_PASSWORD } = require("mysql/lib/protocol/constants/client")

//create pool stores a pool of connections to the db and let the pool manager give you 
//one of the connections

require("dotenv").config()          //loads .env into process.env

const DB_HOST = process.env.DB_HOST
const DB_USER = process.env.DB_USER
const DB_PASSWORD = process.env.DB_PASSWORD
const DB_DATABASE = process.env.DB_DATABASE
const DB_PORT = process.env.DB_PORT

const db = mysql.createPool({
    connectionLimit:    100,
    host:   DB_HOST,
    user:   DB_USER,
    password: DB_PASSWORD,
    database: DB_DATABASE,
    port: DB_PORT
})

//line 12-27 we stored our db creds in .env and loaded those contents in process and then retrieved data
//from proecc, specifically process.env file, therefore achieving encapsulation of sorts in java terms.

const port = process.env.PORT
//this gets our express server up and running
app.listen(port, () => console.log(`server started on port $(port)`))


/*const db = mysql.createPool({
    connectionLimit: 100,
    host: "127.0.0.1",         //This is your localhost IP
    user: "newuser",          //newuser created in MySql with CRUD access
    password: "admin",       //password for the newuser in mysql
    database: "userdb",      //database name
    port:   "3306"          //port name for mysql
})
*/


//have to read about callback methods
db.getConnection((err,connection) => {
    if(err) throw (err)
    console.log("Db Connected successfully: " + connection.threadId)
})

//we run npx nodemon <Script.js> not sure why npx, after running this js, it creates
//connection with the DB, now we have to create a .env file to store DB files there
//Note: .env file is like a file which stores global const variables/values which can be
//used by other files and modules as well and which has to be hidden


//adding route to createUser

const bycrypt = require("bcrypt")

//to read request body
app.use(express.json())

//create user , read about async
app.post("/createUser", async(req,res) => {
    const user = req.body.name;
    const hashedPassword = await bycrypt.hash(req.body.password,10);

    db.getConnection( async (err,connection) => {

        if (err) throw (err)

        const sqlSearch = "SELECT * FROM usertable WHERE user = ?"
        //here ? is the entry point for .format so it searches user in the db with the above query
        const search_query = mysql.format(sqlSearch,[user])

        const sqlInsert = "INSERT INTO usertable VALUES (0,?,?)"
        const insert_query = mysql.format(sqlInsert,[user, hashedPassword])
        //? will be replaced by value
        //? will be replaced by string

        //read about await
        await connection.query(search_query,async(err, result) => {
            if (err) throw (err)
            console.log("------> Search results")
            console.log(result.length)

            if(result.length != 0){
                connection.release()
                console.log("-----> User already exists")
                res.sendStatus(409)
            }
            else{
                await connection.query(insert_query,(err, result) => {
                    connection.release()

                    if(err) throw (err)
                    console.log("----> Created new user")
                    console.log(result.insertId)
                    res.sendStatus(201)

                })
            }
        })  //end of connection.queery
    })  //end of db.connection()
})  //end of app.post()


/*
1. We first store the "req.body.name" in "user"
2. We then use the bcrypt.hash() function to hash the "password"
NOTE: that the bcrypt.hash() function may take a while to generate the hash, and so we use the "await" keyword in front of it. 
Since we are using the "await" keyword within the function, we need to add "async" keyword in front of the function.
"async" and "await" are basically "syntactical sugar", or a neater way to write promises in Javascript. 
Ideally we want to include the "await" part in a "try/catch" block that represents the "resolve/reject" parts of the Promise. However we will forego this, to keep our code simple and readable for the purposes of this tutorial.
3. We then use the db.getConnection() function to get a new connection. This function may have 2 outcomes, either an "error" or a "connection". i.e. db.getConnection ( (err, connection) )
4. In case we get the connection, we can then QUERY the connection, using connection.query(). Note that since the query() function may take some time to respond, we use the keyword "await" in front of it. Accordingly we need to include the "async" keyword in front of the parent function.
i.e. db.getConnection ( async (err, connection) => {
           await connection.query(<query>) 
})
5. The construction of the query strings are particularly interesting,
const sqlSearch = "SELECT * FROM userTable WHERE user = ?"
const search_query = mysql.format(sqlSearch,[user])
const sqlInsert = "INSERT INTO userTable VALUES (0,?,?)"
const insert_query = mysql.format(sqlInsert,[user, hashedPassword])
NOTE: Basically the ? will get replaced by the values in the []
Also, notice that in the INSERT query we are using (0,?,?), this is because the first column in our userDB is an AUTOINCREMENT column. So we pass either a "0" or "null", and the mySQL database will assign the next autoincrement value from its side 
i.e. we do not need to pass a value in the query, and we want mySQL DB to assign an autoincremented value.
6. The reason we have a "search_query" and a "insert_query", is because, we want to check to see if the "user" already exists in our MySQL DB. 
- In case they do, we do not add them again ("User already exists"). - In case they do NOT exist, we add them to the DB.
7. Note that after we make the query, we no longer need the connection and we must call a connection.release()
8. The connection.query() function will either have an error OR a result. i.e. connection.query( (err, result) )
9. The "results" returns each ROW as an object in an array.
Thus if the "search_query" results.length==0, then no ROWs were returned indicating that the user does not exist in the DB
 */



//LOGIN

app.post("/login", (req, res) => {
    
    const user = req.body.name;
    const password = req.body.password;

    db.getConnection( async(err, connection) =>{
        if(err) throw (err)
        const sqlSearch = "SELECT * FROM usertable WHERE user = ?"
        const search_query = mysql.format(sqlSearch, [user])

        await connection.query(search_query, async (err, result) => {
            connection.release()

            if(err) throw (err)

            if(result.length == 0){
                console.log("---> user doesn't exist")
                res.sendStatus(404)
            }
            else{
                const hashedPassword = result[0].password
                //getting password from result after running query

                if(await bycrypt.compare(password, hashedPassword)){
                    console.log("--> user logged in")
                    res.send(`${user} is logged in`)
                }
                else{
                    console.log("---> incorrect password")
                    res.send(`${user} has wrong password`)
                }//end of bycrypt.compare
            }//end of user exists results.length == 0
        })//end of connection
    })//end of db
})//end of post