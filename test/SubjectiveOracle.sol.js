const { expect } = require("chai");

const questionFee = 100;
const question = "What's the weather like today?";
const answer = "Great";
let subjectiveOracle;

beforeEach(async () => {
  const accounts = await ethers.getSigners();
  roles = {
    owner: accounts[0],
    withdrawalDestination: accounts[1],
    randomPerson: accounts[9],
  };
  const subjectiveOracleFactory = await ethers.getContractFactory('SubjectiveOracle', roles.deployer);
  subjectiveOracle = await subjectiveOracleFactory.deploy(questionFee);
});

describe("constructor", function () {
  it("sets the question fee correctly", async function () {
    expect(await subjectiveOracle.questionFee()).to.equal(questionFee);
  });
});

describe("ask", function () {
  context("Payment is exact", function () {
    it("asksn", async function () {
      await expect(
        subjectiveOracle
          .ask(question, { value: questionFee })
      )
        .to.emit(subjectiveOracle, 'Asked')
        .withArgs(0, question);
    });
  });
  context("Payment is redundant", function () {
    it("asks", async function () {
      await expect(
        subjectiveOracle
          .ask(question, { value: questionFee * 2 })
      )
        .to.emit(subjectiveOracle, 'Asked')
        .withArgs(0, question);
    });
  });
  context("Payment is inadequate", function () {
    it("reverts", async function () {
      await expect(
        subjectiveOracle
          .ask(question, { value: questionFee / 2 })
      ).to.be.revertedWith('Payment inadequate');
    });
  });
});

describe("answer", function () {
  context("Caller is owner", function () {
    it("answers", async function () {
      // Mock-ask a question even though we do not need to
      await subjectiveOracle.ask(question, { value: questionFee });
      await expect(
        subjectiveOracle
          .connect(roles.owner)
          .answer(0, answer)
      )
        .to.emit(subjectiveOracle, 'Answered')
        .withArgs(0, answer);
      expect(await subjectiveOracle.questionIndexToAnswer(0)).to.equal(answer);
    });
  });
  context("Caller is not owner", function () {
    it("reverts", async function () {
      // Mock-ask a question even though we do not need to
      await subjectiveOracle.ask(question, { value: questionFee });
      await expect(
        subjectiveOracle
          .connect(roles.randomPerson)
          .answer(0, answer)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});

describe("withdraw", function () {
  context("Caller is owner", function () {
    context("Withdrawal will go through", function () {
      it("withdraws", async function () {
        // Mock-ask a question to send funds to the contract
        await subjectiveOracle.ask(question, { value: questionFee });
        const initialBalance = await ethers.provider.getBalance(roles.withdrawalDestination.address);
        await expect(
          subjectiveOracle
            .connect(roles.owner)
            .withdraw(roles.withdrawalDestination.address)
        )
          .to.emit(subjectiveOracle, 'Withdrew')
          .withArgs(roles.withdrawalDestination.address, questionFee);
        const finalBalance = await ethers.provider.getBalance(roles.withdrawalDestination.address);
        expect(finalBalance.sub(initialBalance)).to.equal(questionFee);
        expect(await ethers.provider.getBalance(subjectiveOracle.address)).to.equal(0);
      });
    });
    context("Withdrawal will not go through", function () {
      it("reverts", async function () {
        // Mock-ask a question to send funds to the contract
        await subjectiveOracle.ask(question, { value: questionFee });
        // Withdrawal will not go through because `SubjectiveOracle.sol` does not have
        // a default `payable` method
        await expect(
          subjectiveOracle
            .connect(roles.owner)
            .withdraw(subjectiveOracle.address)
        ).to.be.revertedWith('Withdraw failed');
      });
    });
  });
  context("Caller is not owner", function () {
    it("reverts", async function () {
      // Mock-ask a question to send funds to the contract
      await subjectiveOracle.ask(question, { value: questionFee });
      await expect(
        subjectiveOracle
          .connect(roles.randomPerson)
          .withdraw(roles.withdrawalDestination.address)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});
