const fs = require("fs");
const { exec } = require("child_process");

// Use metaboss to interact with Metaplex

const main = () => {
  const results = {
    collectionMint: "",
    nftMint: [],
  };
  const collectionContent = fs.readFileSync(
    "../arweave-image-uploader/public/arweave-collection-uris.json",
    "utf-8"
  );
  const collectionParsed = JSON.parse(collectionContent);
  const collectionUri = collectionParsed[0];

  const content = fs.readFileSync(
    "../arweave-image-uploader/public/arweave-uris.json",
    "utf-8"
  );
  const parsed = JSON.parse(content);
  const nftUris = parsed;

  // Mint Collection
  exec(
    `metaboss mint one --keypair ${process.env.KEYPAIR} --external-metadata-uri ${collectionUri} --receiver ${process.env.RECEIVER} --immutable --primary-sale-happened`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`${error}`);
        return;
      }
      // console.log(`${stdout}`);
      console.error(`${stderr}`);

      // Extract mint
      const regex = /[A-HJ-NP-Za-km-z1-9]{40,50}/g;
      const collectionMint = stdout.match(regex)[1];
      console.log(`collectionMint: ${collectionMint}`);

      results.collectionMint = collectionMint;

      nftUris.forEach((uri) => {
        // Mint
        exec(
          `metaboss mint one --external-metadata-uri ${uri} --keypair ${process.env.KEYPAIR} --receiver ${process.env.RECEIVER} --immutable --primary-sale-happened`,
          (error, stdout, stderr) => {
            if (error) {
              console.error(`${error}`);
              return;
            }
            // console.log(`${stdout}`);
            // console.error(`${stderr}`);

            // Extract mint
            const regex = /[A-HJ-NP-Za-km-z1-9]{40,50}/g;
            const nftMint = stdout.match(regex)[1];
            console.log(`nftMint: ${nftMint}`);

            // Set and Verify Collection
            exec(
              `metaboss collections set-and-verify --keypair ${process.env.KEYPAIR} --collection-mint ${collectionMint} --nft-mint ${nftMint} --update-authority-nft ${process.env.AUTHORITY}`,
              (error, stdout, stderr) => {
                if (error) {
                  console.error(`${error}`);
                  return;
                }
                // console.log(`${stdout}`);
                // console.error(`${stderr}`);

                results.nftMint.push(nftMint);

                // Write file

                const jsonstr = JSON.stringify(results, null, 2);
                fs.writeFileSync(`./mints.json`, jsonstr);
              }
            );
          }
        );
      });
    }
  );
};

main();
