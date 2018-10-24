
var sa = require('safex-addressjs');
var request = require('sync-request');

require('dns').resolve('bitcoin.safex.io', function (err) {
    if (err) {
        console.log("No connection");
    } else {
        console.log("Connected");


        let burn_address = "1SAFEXg6ah1JqixuYUnEyKetC4hJhztoz";

        let start_page = 0;


//1 fetch all data
//2 extract all senders -- get the address that sent it and pack it into an object
//store Safex1
//store Safex2
//store SAFEX transactions
//check order by block height


        var res = request('GET', 'http://bitcoin.safex.io:3001/insight-api/txs/?address=' + burn_address + '&pageNum=' + start_page);

        var endpage = JSON.parse(res.getBody()).pagesTotal;

        console.log(endpage);

        let index = 0;
        let txns = {};
        txns.txns = [];


        while (index < endpage) {
            console.log("fetching more txns");

            var res = request('GET', 'http://bitcoin.safex.io:3001/insight-api/txs/?address=' + burn_address + '&pageNum=' + index);
            var page = JSON.parse(res.getBody());
            page.txs.forEach(tx => {
                txns.txns.push(tx);
        })
            index += 1;
        }

        console.log(txns.txns.length)


        let book = {};
        book.addresses = [];

        txns.txns.forEach((tx) => {

            let duplicate = false;
        let index = 0;
        for (var x = 0; x < book.addresses.length; x++) {
            if (book.addresses[x].address == tx.vin[0].addr) {
                duplicate = true;
                index = x;
            }
        }
        if (duplicate == true) {

            book.addresses[index].txns.push(tx);
        } else {
            let address = {};
            address.address = tx.vin[0].addr;
            address.txns = [tx];
            address.safex_addresses = [];
            address.migrated_balance = 0;
            book.addresses.push(address);
        }


    })
        ;


        book.addresses.forEach((account, account_key) => {


            console.log("=========================**********************++++)))))))))))))))))))))))))))))))))")
        console.log(account.address);

        //collect first halves
        //collect second halves
        //run test against them match up by checksum
        //sort by blockheight

        book.addresses[account_key].first_halves = [];
        book.addresses[account_key].second_halves = [];
        book.addresses[account_key].burn_txns = [];
        book.addresses[account_key].migrated_balance = 0;

        console.log("entering account.txns.foreach loop");
        //analyze transactions here
        account.txns.forEach((txn) => {

            txn.vout.forEach((out) => {
            if(out.scriptPubKey.hex.slice(0, 2) === "6a" && out.scriptPubKey.hex.slice(4, 16) === "536166657831"
    )
        {
            var first_half = {};

            first_half.key = out.scriptPubKey.hex.slice(16, 80);
            first_half.checksum = out.scriptPubKey.hex.slice(80, 88);
            first_half.blockheight = txn.blockheight;

            book.addresses[account_key].first_halves.push(first_half);

        }
    else
        if (out.scriptPubKey.hex.slice(0, 2) === "6a" && out.scriptPubKey.hex.slice(4, 16) === "536166657832") {

            var second_half = {};

            second_half.key = out.scriptPubKey.hex.slice(16, 80);
            second_half.checksum = out.scriptPubKey.hex.slice(80, 88);
            second_half.blockheight = txn.blockheight;

            book.addresses[account_key].second_halves.push(second_half)

        } else if (out.scriptPubKey.hex.slice(0, 2) === "6a" && out.scriptPubKey.hex.slice(4, 12) === "6f6d6e69") {
            var resp = request('POST', 'http://omni.safex.io:3002/validate_transaction', {
                json: {txid: txn.txid},
            });

            var resp_json = JSON.parse(resp.getBody());

            if (resp_json.valid === true &&
                resp_json.propertyid === 56 &&
                resp_json.confirmations > 1 &&
                resp_json.referenceaddress === burn_address) {

                let burn_txn = {};
                burn_txn.amount = resp_json.amount;
                burn_txn.txid = resp_json.txid;
                burn_txn.blockheight = resp_json.block;
                book.addresses[account_key].burn_txns.push(burn_txn);

                book.addresses[account_key].migrated_balance += parseInt(resp_json.amount);
            }

            //save to database this is an omni transaction
            //check its associated address
            //if it is then relate these data

        }
        //this will give you the balance of the migrated from this person
        //all of this info we need to keep in memory

    })

    })

        console.log("burn txns " + account.burn_txns.length)


        account.first_halves.sort((a, b) => {
            return a.blockheight - b.blockheight;
    })
        account.second_halves.sort((a, b) => {
            return a.blockheight - b.blockheight;
    })

        account.burn_txns.sort((a, b) => {
            return a.blockheight - b.blockheight;
    })

        for (var i = 0; i < account.first_halves.length; i++) {

            for (var j = 0; j < account.second_halves.length; j++) {

                let addresses = book.addresses[account_key].safex_addresses;

                if (account.first_halves[i].checksum === account.second_halves[j].checksum) {
                    const safex_address = sa.pubkeys_to_string(account.first_halves[i].key, account.second_halves[j].key);
                    const newsum = sa.address_checksum(account.first_halves[i].key, account.second_halves[j].key);
                    if (newsum === account.first_halves[i].checksum && newsum === account.second_halves[j].checksum) {
                        let safexaddress = {};
                        safexaddress.address = safex_address;
                        safexaddress.checksum = newsum;
                        safexaddress.blockheight1 = account.first_halves[i].blockheight;
                        safexaddress.blockheight2 = account.second_halves[j].blockheight;
                        safexaddress.balance = 0;
                        safexaddress.burns = [];
                        if (book.addresses[account_key].safex_addresses.length === 0) {
                            book.addresses[account_key].safex_addresses.push(safexaddress);
                            console.log("breaking loop first match found ")
                            break;
                        } else {
                            var duplicate_flag = false;

                            for (var z = 0; z < addresses.length; z++) {
                                if (safexaddress.checksum === addresses[z].checksum &&
                                    safexaddress.blockheight1 === addresses[z].blockheight1 &&
                                    safexaddress.blockheight2 === addresses[z].blockheight2) {

                                    console.log("ignore duplicate");
                                    duplicate_flag = true;
                                    break;

                                } else if (safexaddress.blockheight1 > addresses[addresses.length - 1].blockheight1 &&
                                    safexaddress.blockheight2 > addresses[addresses.length - 1].blockheight2) {
                                    book.addresses[account_key].safex_addresses.push(safexaddress);
                                    console.log("breaking loop now both blockheights are greater match found ")
                                    duplicate_flag = true;
                                    break;
                                }

                            } //for loop ened
                            if (duplicate_flag === true) {
                                break;
                            }
                        }
                    }
                }
            }
        }

        console.log(" number of safex addresses " + book.addresses[account_key].safex_addresses.length);


        if (account.safex_addresses.length > 0) {

            account.safex_addresses.sort((a, b) => {
                return a.blockheight1 - b.blockheight1;
        })

            console.log(" [0] and other")

            console.log(account.safex_addresses)


            account.burn_txns.forEach(burn => {
                console.log(burn.blockheight)

            if (account.safex_addresses.length === 1
            ) {
                book.addresses[account_key].safex_addresses[0].burns.push(burn);
                book.addresses[account_key].safex_addresses[0].balance += parseInt(burn.amount);
                console.log("one address balance " + book.addresses[account_key].safex_addresses[0].balance)
            }
            else {
                let bottom = 0;
                let addy;
                let index = 0;
                for (var i = 0; i < account.safex_addresses.length; i++) {
                    if (account.safex_addresses[i].blockheight1 <= burn.blockheight &&
                        account.safex_addresses[i].blockheight2 <= burn.blockheight &&
                        bottom === 0) {

                        bottom = account.safex_addresses[i].blockheight1;
                        addy = account.safex_addresses[i];
                        index = i;
                        console.log("burn is greater on zero")

                    } else if (account.safex_addresses[i].blockheight1 <= burn.blockheight &&
                        account.safex_addresses[i].blockheight2 <= burn.blockheight &&
                        bottom < account.safex_addresses[i].blockheight1) {

                        bottom = account.safex_addresses[i].blockheight1;
                        addy = account.safex_addresses[i];
                        index = i;
                        console.log("burn is greater on more")
                    }


                }
                if (bottom === 0) {
                    book.addresses[account_key].safex_addresses[0].burns.push(burn);
                    book.addresses[account_key].safex_addresses[0].balance += parseInt(burn.amount);
                    console.log("added bottom 0 found by block address balance " + book.addresses[account_key].safex_addresses[0].balance)
                }
                if (bottom <= burn.blockheight) {
                    if (book.addresses[account_key].safex_addresses[index].blockheight1 === bottom) {
                        book.addresses[account_key].safex_addresses[index].burns.push(burn);
                        book.addresses[account_key].safex_addresses[index].balance += parseInt(burn.amount);
                        console.log("found by block address balance " + book.addresses[account_key].safex_addresses[index].balance)
                    }
                }
            }
        })
        }


        console.log("now its sorted")


        console.log(account.migrated_balance)
        console.log(account.address)

        for (var i = 0; i < book.addresses[account_key].safex_addresses.length; i++) {



                for (var j = 0; j < book.addresses[account_key].safex_addresses[i].burns.length; j++) {

                    console.log(book.addresses[account_key].safex_addresses[i].address)
                    console.log(book.addresses[account_key].safex_addresses[i].burns[j].txid)
                    console.log(book.addresses[account_key].safex_addresses[i].burns[j].amount)


            }

            console.log(account.safex_addresses[i].balance);

        }

        console.log("=========================**********************++++)))))))))))))))))))))))))))))))))")
    })


        console.log("how many different senders " + book.addresses.length)

    }


});