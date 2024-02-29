<?php

namespace Lib\Prisma\Model;

interface IModel
{
    public function create(array $data);
    public function findUnique(array $criteria);
    public function findMany(array $select);
    public function findFirst(array $criteria);
    public function update(array $data);
    public function delete(array $criteria);
    public function upsert(array $data);
    public function aggregate(array $operation);
    public function groupBy(array $by);
    public function updateMany(array $data);
    public function deleteMany(array $criteria);
    public function count(array $criteria);
}
