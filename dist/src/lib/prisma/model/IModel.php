<?php

namespace Lib\Prisma\Model;

interface IModel
{
    public function create($data);
    public function findUnique($identifier);
    public function findMany($criteria);
    public function findFirst($criteria);
    public function update($identifier, $data);
    public function delete($identifier);
    public function upsert($identifier, $data);
    public function aggregate($operation);
    public function groupBy($criteria, $aggregates);
    public function updateMany($criteria, $data);
    public function deleteMany($criteria);
    public function count($criteria);
    public function executeRaw($sql);
    public function queryRaw($sql);
    public function transaction($operations);
}
