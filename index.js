import mongoose from "mongoose";
import namehash from "@ensdomains/eth-ens-namehash";
import * as fs from "fs";
import MerkleTree from "merkletreejs";
import keccak256 from "keccak256";

function loadIngredients(path) {
  const rawdata = fs.readFileSync(path).toString().split(/\r?\n/);
  rawdata.shift();
  const data = rawdata.map((x) => {
    return x.replace(/ /g, "");
    //  + ".eth"
  });
  return data;
}

function computeNameHash(ingredients) {
  return ingredients.map((x) => namehash.hash(x));
}

function computeMerkleTree(domains) {
  const leaves = domains.map((x) => keccak256(x));
  const tree = new MerkleTree.MerkleTree(leaves, keccak256);
  const root = tree.getRoot().toString("hex");

  // const proof = tree.getProof(leaves[0]);

  const proofs = leaves.map((x) => tree.getHexProof(x));

  // console.log(tree.verify(proof, leaves[0], root));

  return { root: root, proofs: proofs };
}

(async () => {
  console.log("Inserting the data");
  await mongoose.connect("mongodb://localhost:27017/lfb");
  const Ingredient = mongoose.model("Ingredient", {
    domain: "string",
    hash: "string",
    path: "array",
  });
  const domains = loadIngredients("./data/clean_ingredients.csv");
  const hashes = computeNameHash(domains);
  const merkle = computeMerkleTree(domains);
  for (let i = 0; i < 10; i++) {
    const mongoIngredient = new Ingredient({
      domain: domains[i].concat(".eth"),
      hash: hashes[i],
      path: merkle["proofs"][i],
    });
    await mongoIngredient.save();
  }
  mongoose.connection.close();
  console.log("Finished!");
})();
