-- Add Travel Agent recruitment flag to Job
ALTER TABLE `Job`
  ADD COLUMN `isTravelAgentPosition` BOOLEAN NOT NULL DEFAULT FALSE;
