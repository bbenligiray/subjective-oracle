//SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "@openzeppelin/contracts/access/Ownable.sol";


/// @title Subjective oracle contract that receives questions in return of
/// payment 
contract SubjectiveOracle is Ownable {
    uint256 public immutable questionFee;
    uint256 public questionCount;
    mapping(uint256 => string) public questionIndexToAnswer;

    event Asked(
        uint256 indexed questionIndex,
        string question
        );

    event Answered(
        uint256 indexed questionIndex,
        string answer
        );

    event Withdrew(
        address destination,
        uint256 amount
        );

    /// @dev `questionFee` is immutable for the sake of simplicity
    /// @param _questionFee Question fee
    constructor(uint256 _questionFee)
    {
        questionFee = _questionFee;
    }

    /// @notice Called by the users along with some ETH to direct a question to
    /// the subjective oracle
    /// @dev Note that we are not storing the question but merely logging it as
    /// an event. The subjective oracle will listen for these events and call
    /// `answerQuestion()` back accordingly.
    /// There is no guarantee that the question will be answered.
    /// @param question Question to be answered in plain English
    /// @return Question index
    function ask(string calldata question)
        external
        payable
        returns (uint256)
    {
        require(msg.value >= questionFee, "Payment inadequate");
        uint256 questionIndex = questionCount++;
        emit Asked(questionIndex, question);
        return questionIndex;
    }

    /// @notice Called by the subjective oracle to answer a specific question
    /// @dev The user will then need to "pull" the answer from this contract
    /// @param questionIndex Question index
    /// @param answer Answer to the question in plain English
    function answer(
        uint256 questionIndex,
        string calldata answer
        )
        external
        onlyOwner
    {
        questionIndexToAnswer[questionIndex] = answer;
        emit Answered(questionIndex, answer);
    }

    /// @notice Called by the subjective oracle to withdraw the entire balance
    /// @param destination Withdrawal destination
    function withdraw(address destination)
        external
        onlyOwner
    {
        uint256 amount = address(this).balance;
        emit Withdrew(destination, amount);
        (bool success, ) = destination.call{value:amount}("");
        require(success, "Withdraw failed");
    }
}
