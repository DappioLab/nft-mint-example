import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import Arweave from "arweave";
import csv from "csv-parser";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const results = [];

const initOptions = {
  host: "arweave.net", // Hostname or IP address for a Arweave host
  port: 443, // Port
  protocol: "https", // Network protocol http or https
  timeout: 20000, // Network request timeouts in milliseconds
  logging: false, // Enable network request logging
};

const getNftName = (name) => `SolMeet DAO #${name}`;

const getMetadata = (name, imageUrl, attributes) => ({
  name: getNftName(name),
  symbol: "SolMeet",
  description: "SolMeet DAO",
  seller_fee_basis_points: 100,
  external_url: "https://solmeet.dev",
  attributes,
  collection: {
    name: "SolMeet",
    family: "DAO",
  },
  properties: {
    files: [
      {
        uri: imageUrl,
        type: "image/png",
      },
    ],
    category: "image",
    maxSupply: 0,
    creators: [
      {
        address: "3bnAKgVhM1MihYpJQ6hK83BirWhVFbyhkvvCQqJ8tZ25",
        share: 100,
      },
    ],
  },
  image: imageUrl,
});

const getCollectionMetadata = (name, family, imageUrl) => ({
  name,
  symbol: "SolMeet",
  description: "SolMeet DAO",
  seller_fee_basis_points: 100,
  external_url: "https://solmeet.dev",
  collection: {
    name,
    family,
  },
  properties: {
    files: [
      {
        uri: imageUrl,
        type: "image/png",
      },
    ],
    category: "image",
    maxSupply: 0,
    creators: [
      {
        address: "3bnAKgVhM1MihYpJQ6hK83BirWhVFbyhkvvCQqJ8tZ25",
        share: 100,
      },
    ],
  },
  image: imageUrl,
});

// run localy
// npx @textury/arlocal
const initOptionsLocal = {
  host: "localhost", // Hostname or IP address for a Arweave host
  port: 1984, // Port
  protocol: "http", // Network protocol http or https
  timeout: 20000, // Network request timeouts in milliseconds
  // logging: false,     // Enable network request logging
};

const arweave = Arweave.init(initOptions);
let key = JSON.parse(process.env.KEY);

const runUpload = async (data, contentType, isUploadByChunk = false) => {
  const tx = await arweave.createTransaction({ data: data }, key);

  tx.addTag(...contentType);

  await arweave.transactions.sign(tx, key);

  if (isUploadByChunk) {
    const uploader = await arweave.transactions.getUploader(tx);

    while (!uploader.isComplete) {
      await uploader.uploadChunk();
      console.log(
        `${uploader.pctComplete}% complete, ${uploader.uploadedChunks}/${uploader.totalChunks}`
      );
    }
  }

  //   Do we need to post with uploader?
  await arweave.transactions.post(tx);

  //   console.log("url", `http://localhost:1984/${tx.id}`);
  //   console.log("url", `https://arweave.net/${tx.id}`);
  return tx;
};

const folder = "./public/images/";
let metadataCollection = {};
let metadataUri = [];
let metadataCollectionUri = [];

const getAttributes = (props) => {
  // map attributes to the proper key/value objects
  const attrs = Object.keys(props).map((key) => {
    return {
      trait_type: key,
      value: props[key],
    };
  });

  return attrs;
};

const iterateOverItems = async () => {
  try {
    for (const row of results) {
      // get separately name and props
      const { Name: name, ...props } = row;
      console.log("name", name);
      const nameByNumber = Number.parseInt(name);

      const filePath = folder + nameByNumber + ".png";
      console.log("filePath", filePath);

      let newItem = {};

      try {
        const data = fs.readFileSync(filePath);
        // if (!data) console.warn(`Can't find file: ${filePath}`);

        const contentType = ["Content-Type", "image/png"];
        const { id } = await runUpload(data, contentType, true);
        const imageUrl = id ? `https://arweave.net/${id}` : undefined;
        console.log("imageUrl", imageUrl);

        const attributes = getAttributes(props);

        const metadata = getMetadata(name, imageUrl, attributes);
        // console.log(metadata);
        const metaContentType = ["Content-Type", "application/json"];
        const metadataString = JSON.stringify(metadata);
        const { id: metadataId } = await runUpload(
          metadataString,
          metaContentType
        );
        const metadataUrl = id
          ? `https://arweave.net/${metadataId}`
          : undefined;

        console.log("metadataUrl", metadataUrl);
        newItem = {
          [nameByNumber]: {
            name: getNftName(name),
            uri: metadataUrl,
          },
        };
        metadataUri.push(metadataUrl);
      } catch (error) {
        newItem = {
          [nameByNumber]: undefined,
        };
      }

      //   update collection with new item
      metadataCollection = { ...metadataCollection, ...newItem };
    }

    // Collection
    const collectionFilePath = folder + "../collection-logo.png";
    const collectionLogo = fs.readFileSync(collectionFilePath);
    const contentType = ["Content-Type", "image/png"];
    const { id } = await runUpload(collectionLogo, contentType, true);
    const imageUrl = id ? `https://arweave.net/${id}` : undefined;
    const collectionName = "SolMeet NFT DAO";
    const collectionFamily = "DAO";
    const metadata = getCollectionMetadata(
      collectionName,
      collectionFamily,
      imageUrl
    );
    const metaContentType = ["Content-Type", "application/json"];
    const metadataString = JSON.stringify(metadata);
    const { id: metadataId } = await runUpload(metadataString, metaContentType);
    const metadataUrl = id ? `https://arweave.net/${metadataId}` : undefined;

    console.log("metadataUrl", metadataUrl);
    const newItem = {
      collection: {
        name: collectionName,
        uri: metadataUrl,
      },
    };
    metadataCollectionUri.push(metadataUrl);

    metadataCollection = { ...metadataCollection, ...newItem };

    // All images iterated
    console.log(metadataCollection);

    // Save data to json in /public/
    const data = JSON.stringify(metadataCollection);
    fs.writeFileSync("./public/arweave-images.json", data);
    const uris = JSON.stringify(metadataUri);
    fs.writeFileSync("./public/arweave-uris.json", uris);
    const collectionUris = JSON.stringify(metadataCollectionUri);
    fs.writeFileSync("./public/arweave-collection-uris.json", collectionUris);
  } catch (e) {
    // Catch anything bad that happens
    console.error("We've thrown! Whoops!", e);
  }
};

const readCsv = async () => {
  //   Consider to use local wallet instead of generated one.
  //.  I'm not sure how this works, since newly generated wallet have 0 balance. 🤷🏻‍♂️
  //.  So, I comment out this line for now.
  //   key = await arweave.wallets.generate();

  fs.createReadStream(path.resolve(__dirname, "public", "data.csv"))
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", () => {
      //   console.log(results);
      //   {
      //     Name: '0000',
      //     'Background Color': 'palegreen',
      //     'Head Color': 'lightblue',
      //     'Neck Color': 'lightslategray',
      //      ...
      //   },

      iterateOverItems();
    });
};

readCsv();
