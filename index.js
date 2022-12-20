import mongoose, { mongo } from "mongoose";
import namehash from "@ensdomains/eth-ens-namehash";
import * as fs from "fs";
import MerkleTree from "merkletreejs";
import keccak256 from "keccak256";

function loadIngredients(path) {
  const rawdata = fs.readFileSync(path).toString().split(/\r?\n/);
  rawdata.shift();
  const data = rawdata.map((x) => {
    return x.replace(/ /g, "") + ".eth";
  });
  return data;
}

function computeNameHash(ingredients) {
  return ingredients.map((x) => namehash.hash(x));
}

function computeKeccak(nameHashes) {
  return nameHashes.map((x) => keccak256(x));
}

function computeMerkleTree(sortedLeaves) {
  const tree = new MerkleTree.MerkleTree(sortedLeaves, keccak256, {
    sort: true,
  });
  const root = tree.getRoot().toString("hex");
  const proofs = sortedLeaves.map((x) => tree.getHexProof(x));
  return { root: root, proofs: proofs, tree: tree };
}

function sortAll(ingredients, nameHashes, leaves) {
  let data = [];
  for (let i = 0; i < ingredients.length; i++) {
    data.push({
      ingredient: ingredients[i],
      nameHash: nameHashes[i],
      leaf: leaves[i],
    });
  }

  data.sort((a, b) => Buffer.compare(a.leaf, b.leaf));

  for (let i = 0; i < ingredients.length; i++) {
    ingredients[i] = ingredients[i];
    nameHashes[i] = nameHashes[i];
    leaves[i] = leaves[i];
  }
}

(async () => {
  console.log("Inserting the data");
  let MONGO_URI;
  if (process.env.NODE_ENV === "prod") {
    MONGO_URI = "mongodb://mongo_db:27017/lfb";
  } else {
    MONGO_URI = "mongodb://localhost:27017/lfb";
  }
  await mongoose.connect(MONGO_URI);
  const Ingredient = mongoose.model("Ingredient", {
    domain: "string",
    hash: "string",
    path: "array",
  });
  let dbContent = await Ingredient.find().exec();
  if (dbContent.length > 0) {
    console.log("db already filled ... exit");
    process.exit();
  }
  const ingredients = loadIngredients("./data/clean_ingredients.csv");
  const hashes = computeNameHash(ingredients);
  const leaves = computeKeccak(hashes);
  sortAll(ingredients, hashes, leaves);
  const merkle = computeMerkleTree(leaves);
  console.log("Merkle Root: ", "0x" + merkle.root);
  for (let i = 0; i < ingredients.length; i++) {
    const mongoIngredient = new Ingredient({
      domain: ingredients[i],
      hash: hashes[i],
      path: merkle["proofs"][i],
    });
    await mongoIngredient.save();
  }
  mongoose.connection.close();
  console.log("Finished!");
})();
