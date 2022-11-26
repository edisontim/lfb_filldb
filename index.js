import mongoose from "mongoose";
import Ingredients from "./ingredients.json" assert { type: "json" };
import namehash from "@ensdomains/eth-ens-namehash";
console.log(Ingredients.ingredients);

(async () => {
  console.log("Here!");
  await mongoose.connect("mongodb://localhost:27017/lfb");
  console.log(mongoose.connection.readyState);
  const Ingredient = mongoose.model("Ingredient", {
    domain: "string",
    hash: "string",
  });
  for (let ingredient of Ingredients.ingredients) {
    var hash = namehash.hash(ingredient);
    const mongoIngredient = new Ingredient({
      domain: ingredient.concat(".eth"),
      hash: hash,
    });
    await mongoIngredient.save();
  }
})();
