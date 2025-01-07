<?php

namespace Lib\Prisma\Classes;

use Lib\Validator;

enum ArrayType: string
{
    case Associative = 'associative';
    case Indexed = 'indexed';
    case Value = 'value';
}

final class PPHPUtility
{
    /**
     * Checks if the fields exist with references in the given selection.
     *
     * @param array $select The selection array containing fields to check.
     * @param array &$relatedEntityFields Reference to an array where related entity fields will be stored.
     * @param array &$primaryEntityFields Reference to an array where primary entity fields will be stored.
     * @param array $relationName An array of relation names.
     * @param array $fields An array of fields in the model.
     * @param string $modelName The name of the model being checked.
     * @param string $timestamp The timestamp field name to be ignored during the check.
     *
     * @throws \Exception If a field does not exist in the model or if the selection format is incorrect.
     */
    public static function checkFieldsExistWithReferences(
        array $select,
        array &$relatedEntityFields,
        array &$primaryEntityFields,
        array $relationName,
        array $fields,
        string $modelName,
        string $timestamp
    ) {
        if (isset($select) && is_array($select)) {
            foreach ($select as $key => $value) {
                if ($key === $timestamp) continue;

                if (is_numeric($key) && is_string($value)) {
                    if (array_key_exists($value, $fields))
                        throw new \Exception("The '$value' is indexed, waiting example: ['$value' => true]");
                }

                if (isset($value) && empty($value) || !is_bool($value)) {
                    if (is_string($key) && !array_key_exists($key, $fields)) {
                        throw new \Exception("The field '$key' does not exist in the $modelName model.");
                    }

                    if (is_string($key) && array_key_exists($key, $fields)) {
                        if (!is_bool($value) && !is_array($value)) {
                            throw new \Exception("The '$key' is indexed, waiting example: ['$key' => true]");
                        }
                    }

                    if (!is_array($value))
                        continue;
                }

                if (is_string($key) && is_array($value)) {
                    if (isset($value['select'])) {
                        $relatedEntityFields[$key] = $value['select'];
                    } else {
                        if (is_array($value) && empty($value)) {
                            $relatedEntityFields[$key] = [$key];
                        } else {
                            if (!is_bool($value) || empty($value)) {
                                throw new \Exception("The '$key' is indexed, waiting example: ['$key' => true] or ['$key' => ['select' => ['field1' => true, 'field2' => true]]]");
                            }
                        }
                    }
                } else {
                    foreach (explode(',', $key) as $fieldName) {
                        if ($key === $timestamp || $fieldName === $timestamp) continue;
                        $fieldName = trim($fieldName);

                        if (!array_key_exists($fieldName, $fields)) {
                            $availableFields = implode(', ', array_keys($fields));
                            throw new \Exception("The field '$fieldName' does not exist in the $modelName model. Available fields are: $availableFields");
                        }

                        if (
                            in_array($fieldName, $relationName) ||
                            (isset($fields[$fieldName]) && in_array($fields[$fieldName]['type'], $relationName))
                        ) {
                            $relatedEntityFields[$fieldName] = [$fieldName];
                            continue;
                        }

                        $isRelationalOrInverse = false;
                        if (isset($fields[$fieldName]['decorators'])) {
                            foreach ($fields[$fieldName]['decorators'] as $decoratorKey => $decoratorValue) {
                                if ($decoratorKey === 'relation' || $decoratorKey === 'inverseRelation') {
                                    $isRelationalOrInverse = true;
                                    break;
                                }
                            }
                        }

                        if (!$isRelationalOrInverse) {
                            if (in_array($fieldName, $primaryEntityFields)) continue;
                            $primaryEntityFields[] = $fieldName;
                        }
                    }
                }
            }
        }
    }

    /**
     * Checks if the fields in the select array exist in the fields array for the given model.
     *
     * @param array $select The array of fields to select.
     * @param array $fields The array of fields available in the model.
     * @param string $modelName The name of the model being checked.
     *
     * @throws \Exception If a field in the select array does not exist in the fields array.
     */
    public static function checkFieldsExist(array $select, array $fields, string $modelName)
    {
        foreach ($select as $key => $value) {
            if (is_numeric($key) && is_string($value)) {
                if (array_key_exists($value, $fields))
                    throw new \Exception("The '$value' is indexed, waiting example: ['$value' => true]");
            }

            if (isset($value) && empty($value) || !is_bool($value)) {
                if (is_string($key) && !array_key_exists($key, $fields)) {
                    throw new \Exception("The field '$key' does not exist in the $modelName model.");
                }

                if (is_array($value) && !empty($value)) {

                    $isRelatedModel = false;

                    foreach ($fields as $field) {
                        $relation = $field['decorators']['relation'] ?? null;
                        $inverseRelation = $field['decorators']['inverseRelation'] ?? null;
                        $implicitRelation = $field['decorators']['implicitRelation'] ?? null;

                        if (isset($relation['name']) && $relation['name'] == $key || isset($inverseRelation['fromField']) && $inverseRelation['fromField'] == $key || isset($implicitRelation['fromField']) && $implicitRelation['fromField'] == $key) $isRelatedModel = true;
                    }

                    if ($isRelatedModel) continue;

                    $keys = array_keys($value);
                    foreach ($keys as $fieldName) {
                        $fieldName = trim($fieldName);
                        if (!array_key_exists($fieldName, $fields)) {
                            throw new \Exception("The field '$fieldName' does not exist in the $modelName model.");
                        }
                    }
                }

                continue;
            }

            foreach (explode(',', $key) as $fieldName) {
                $fieldName = trim($fieldName);
                if (!array_key_exists($fieldName, $fields)) {
                    throw new \Exception("The field '$fieldName' does not exist in the $modelName model.");
                }
            }
        }
    }

    /**
     * Checks the contents of an array and determines its type.
     *
     * This method iterates through the provided array and checks the type of its elements.
     * It returns an `ArrayType` enum value indicating whether the array is associative,
     * indexed, or contains a single value.
     *
     * @param array $array The array to check.
     * @return ArrayType Returns `ArrayType::Associative` if the array is associative,
     *                   `ArrayType::Indexed` if the array is indexed,
     *                   or `ArrayType::Value` if the array contains a single value.
     */
    public static function checkArrayContents(array $array): ArrayType
    {
        foreach ($array as $key => $value) {
            if (is_array($value)) {
                if (array_keys($value) !== range(0, count($value) - 1)) {
                    return ArrayType::Associative;
                } else {
                    return ArrayType::Indexed;
                }
            } else {
                return ArrayType::Value;
            }
        }
    }

    /**
     * Checks and processes the include array for related entity fields and includes.
     *
     * @param array $include The array of includes to be checked.
     * @param array &$relatedEntityFields The array of related entity fields to be updated.
     * @param array &$includes The array of includes to be updated.
     * @param array $fields The array of fields in the model.
     * @param string $modelName The name of the model being processed.
     *
     * @throws \Exception If an include value is indexed incorrectly or if a field does not exist in the model.
     */
    public static function checkIncludes(array $include, array &$relatedEntityFields, array &$includes, array $fields, string $modelName)
    {
        if (isset($include) && is_array($include)) {
            foreach ($include as $key => $value) {
                if (is_array($value) && array_key_exists('join.type', $value)) {
                    continue;
                }

                self::processIncludeValue($key, $value, $relatedEntityFields, $fields, $modelName, $key);

                if (is_numeric($key) && is_string($value)) {
                    throw new \Exception("The '$value' is indexed, waiting example: ['$value' => true]");
                }

                if (isset($value) && empty($value) || !is_bool($value)) {
                    continue;
                }

                if (!array_key_exists($key, $fields)) {
                    throw new \Exception("The field '$key' does not exist in the $modelName model.");
                }

                $includes[$key] = $value;
            }
        }
    }

    private static function processIncludeValue($key, $value, &$relatedEntityFields, $fields, $modelName, $parentKey)
    {
        if (isset($value['select']) || isset($value['where'])) {
            $relatedEntityFields[$parentKey] = $value;
        } elseif (is_array($value)) {
            if (empty($value)) {
                $relatedEntityFields[$parentKey] = [$parentKey];
            } else {
                foreach ($value as $k => $v) {
                    if (is_string($k) && (is_bool($v) || empty($v))) {
                        $relatedEntityFields[$parentKey]['include'] = [$k => $v];
                    } else {
                        self::processIncludeValue($k, $v, $relatedEntityFields, $fields, $modelName, $parentKey);
                    }
                }
            }
        } else {
            if (!is_bool($value) || empty($value)) {
                throw new \Exception("The '$value' is indexed, waiting example: ['$value' => true] or ['$value' => ['select' => ['field1' => true, 'field2' => true]]]");
            }
        }
    }

    /**
     * Processes an array of conditions and converts them into SQL conditions and bindings.
     *
     * @param array $conditions The array of conditions to process.
     * @param array &$sqlConditions The array to store the resulting SQL conditions.
     * @param array &$bindings The array to store the resulting bindings for prepared statements.
     * @param string $dbType The type of the database (e.g., MySQL, PostgreSQL).
     * @param string $tableName The name of the table to which the conditions apply.
     * @param string $prefix The prefix to use for condition keys (used for nested conditions).
     * @param int $level The current level of nesting for conditions (used for recursion).
     *
     * @return void
     */
    public static function processConditions(array $conditions, &$sqlConditions, &$bindings, $dbType, $tableName, $prefix = '', $level = 0)
    {
        foreach ($conditions as $key => $value) {
            if (in_array($key, ['AND', 'OR', 'NOT'])) {
                $groupedConditions = [];
                if ($key === 'NOT') {
                    self::processNotCondition($value, $groupedConditions, $bindings, $dbType, $tableName, $prefix . $key . '_', $level);
                    if (!empty($groupedConditions)) {
                        $conditionGroup = '(' . implode(" $key ", $groupedConditions) . ')';
                        $conditionGroup = 'NOT ' . $conditionGroup;
                        $sqlConditions[] = $conditionGroup;
                    }
                } else {
                    foreach ($value as $conditionKey => $subCondition) {
                        if (is_numeric($conditionKey)) {
                            self::processConditions($subCondition, $groupedConditions, $bindings, $dbType, $tableName, $prefix . $key . $conditionKey . '_', $level + 1);
                        } else {
                            self::processSingleCondition($conditionKey, $subCondition, $groupedConditions, $bindings, $dbType, $tableName, $prefix . $key . $conditionKey . '_', $level + 1);
                        }
                    }
                    if (!empty($groupedConditions)) {
                        $conditionGroup = '(' . implode(" $key ", $groupedConditions) . ')';
                        $sqlConditions[] = $conditionGroup;
                    }
                }
            } else {
                self::processSingleCondition($key, $value, $sqlConditions, $bindings, $dbType, $tableName, $prefix, $level);
            }
        }
    }

    private static function processSingleCondition($key, $value, &$sqlConditions, &$bindings, $dbType, $tableName, $prefix, $level)
    {
        $fieldQuoted = self::quoteColumnName($dbType, $key);
        $qualifiedField = $tableName . '.' . $fieldQuoted;

        if (is_array($value)) {
            foreach ($value as $condition => $val) {
                $bindingKey = ":" . $prefix . $key . "_" . $condition . $level;
                switch ($condition) {
                    case 'contains':
                    case 'startsWith':
                    case 'endsWith':
                    case 'equals':
                    case 'not':
                        if ($val === null) {
                            $sqlConditions[] = "$qualifiedField IS NOT NULL";
                        } elseif ($val === '') {
                            $sqlConditions[] = "$qualifiedField != ''";
                        } else {
                            $validatedValue = Validator::string($val);
                            $likeOperator = $condition === 'contains' ? ($dbType == 'pgsql' ? 'ILIKE' : 'LIKE') : '=';
                            if ($condition === 'startsWith') $validatedValue .= '%';
                            if ($condition === 'endsWith') $validatedValue = '%' . $validatedValue;
                            if ($condition === 'contains') $validatedValue = '%' . $validatedValue . '%';
                            $sqlConditions[] = $condition === 'not' ? "$qualifiedField != $bindingKey" : "$qualifiedField $likeOperator $bindingKey";
                            $bindings[$bindingKey] = $validatedValue;
                        }
                        break;
                    case 'gt':
                    case 'gte':
                    case 'lt':
                    case 'lte':
                        if (is_float($val)) {
                            $validatedValue = Validator::float($val);
                        } elseif (is_int($val)) {
                            $validatedValue = Validator::int($val);
                        } elseif (strtotime($val) !== false) {
                            $validatedValue = date('Y-m-d H:i:s', strtotime($val));
                        } else {
                            $validatedValue = Validator::string($val);
                        }
                        $operator = $condition === 'gt' ? '>' : ($condition === 'gte' ? '>=' : ($condition === 'lt' ? '<' : '<='));
                        $sqlConditions[] = "$qualifiedField $operator $bindingKey";
                        $bindings[$bindingKey] = $validatedValue;
                        break;
                    case 'in':
                    case 'notIn':
                        $inPlaceholders = [];
                        foreach ($val as $i => $inVal) {
                            $inKey = $bindingKey . "_" . $i;
                            $validatedValue = Validator::string($inVal);
                            $inPlaceholders[] = $inKey;
                            $bindings[$inKey] = $validatedValue;
                        }
                        $inClause = implode(', ', $inPlaceholders);
                        $sqlConditions[] = "$qualifiedField " . ($condition === 'notIn' ? 'NOT IN' : 'IN') . " ($inClause)";
                        break;
                    default:
                        // Handle other conditions or log an error/warning for unsupported conditions
                        throw new \Exception("Unsupported condition: $condition");
                        break;
                }
            }
        } else {
            if ($value === null) {
                $sqlConditions[] = "$qualifiedField IS NULL";
            } elseif ($value === '') {
                $sqlConditions[] = "$qualifiedField = ''";
            } else {
                $bindingKey = ":" . $prefix . $key . $level;
                $validatedValue = Validator::string($value);
                $sqlConditions[] = "$qualifiedField = $bindingKey";
                $bindings[$bindingKey] = $validatedValue;
            }
        }
    }

    private static function processNotCondition($conditions, &$sqlConditions, &$bindings, $dbType, $tableName, $prefix, $level = 0)
    {
        foreach ($conditions as $key => $value) {
            self::processSingleCondition($key, $value, $sqlConditions, $bindings, $dbType, $tableName, $prefix . 'NOT_', $level);
        }
    }

    /**
     * Checks for invalid keys in the provided data array.
     *
     * This method iterates through the provided data array and checks if each key exists in the allowed fields array.
     * If a key is found that does not exist in the allowed fields, an exception is thrown.
     *
     * @param array $data The data array to check for invalid keys.
     * @param array $fields The array of allowed field names.
     * @param string $modelName The name of the model being checked.
     *
     * @throws \Exception If an invalid key is found in the data array.
     */
    public static function checkForInvalidKeys(array $data, array $fields, string $modelName)
    {
        foreach ($data as $key => $value) {
            if (!empty($key) && !in_array($key, $fields)) {
                throw new \Exception("The field '$key' does not exist in the $modelName model. Accepted fields: " . implode(', ', $fields));
            }
        }
    }

    /**
     * Modifies the given SQL query based on the provided criteria.
     *
     * This function handles the following criteria:
     * - _max: Adds MAX() aggregate functions for specified columns.
     * - _min: Adds MIN() aggregate functions for specified columns.
     * - _count: Adds COUNT() aggregate functions for specified columns.
     * - _avg: Adds AVG() aggregate functions for specified columns.
     * - _sum: Adds SUM() aggregate functions for specified columns.
     * - orderBy: Adds ORDER BY clause based on specified columns and directions.
     * - take: Adds LIMIT clause to restrict the number of rows returned.
     * - skip: Adds OFFSET clause to skip a specified number of rows.
     *
     * @param array $criteria An associative array of criteria for modifying the query.
     * @param string &$sql The SQL query string to be modified.
     * @param string $dbType The type of the database (e.g., 'mysql', 'pgsql').
     * @param string $tableName The name of the table being queried.
     */
    public static function queryOptions(array $criteria, string &$sql, $dbType, $tableName)
    {
        // Handle _max, _min, _count, _avg, and _sum
        $selectParts = [];
        if (isset($criteria['_max'])) {
            foreach ($criteria['_max'] as $column => $enabled) {
                if ($enabled) {
                    $selectParts[] = "MAX($tableName." . self::quoteColumnName($dbType, $column) . ") AS max_$column";
                }
            }
        }
        if (isset($criteria['_min'])) {
            foreach ($criteria['_min'] as $column => $enabled) {
                if ($enabled) {
                    $selectParts[] = "MIN($tableName." . self::quoteColumnName($dbType, $column) . ") AS min_$column";
                }
            }
        }
        if (isset($criteria['_count'])) {
            foreach ($criteria['_count'] as $column => $enabled) {
                if ($enabled) {
                    $selectParts[] = "COUNT($tableName." . self::quoteColumnName($dbType, $column) . ") AS count_$column";
                }
            }
        }
        if (isset($criteria['_avg'])) {
            foreach ($criteria['_avg'] as $column => $enabled) {
                if ($enabled) {
                    $selectParts[] = "AVG($tableName." . self::quoteColumnName($dbType, $column) . ") AS avg_$column";
                }
            }
        }
        if (isset($criteria['_sum'])) {
            foreach ($criteria['_sum'] as $column => $enabled) {
                if ($enabled) {
                    $selectParts[] = "SUM($tableName." . self::quoteColumnName($dbType, $column) . ") AS sum_$column";
                }
            }
        }

        // Prepend to SELECT if _max, _min, _count, _avg, or _sum is specified
        if (!empty($selectParts)) {
            $sql = str_replace('SELECT', 'SELECT ' . implode(', ', $selectParts) . ',', $sql);
        }

        // Handle ORDER BY
        if (isset($criteria['orderBy'])) {
            $orderByParts = self::parseOrderBy($criteria['orderBy'], $dbType, $tableName);
            if (!empty($orderByParts)) {
                $sql .= " ORDER BY " . implode(', ', $orderByParts);
            }
        }

        // Handle LIMIT (take)
        if (isset($criteria['take'])) {
            $sql .= " LIMIT " . intval($criteria['take']);
        }

        // Handle OFFSET (skip)
        if (isset($criteria['skip'])) {
            $sql .= " OFFSET " . intval($criteria['skip']);
        }
    }

    private static function parseOrderBy(array $orderBy, $dbType, $tableName): array
    {
        $orderByParts = [];

        foreach ($orderBy as $column => $direction) {
            if (is_array($direction)) {
                // Handle nested orderBy
                foreach ($direction as $nestedColumn => $nestedDirection) {
                    $nestedDirection = strtolower($nestedDirection) === 'desc' ? 'desc' : 'asc';
                    $orderByParts[] = self::quoteColumnName($dbType, $column) . "." . self::quoteColumnName($dbType, $nestedColumn) . " $nestedDirection";
                }
            } else {
                // Handle regular orderBy
                $direction = strtolower($direction) === 'desc' ? 'desc' : 'asc';
                $orderByParts[] = "$tableName." . self::quoteColumnName($dbType, $column) . " $direction";
            }
        }

        return $orderByParts;
    }

    /**
     * Quotes a column name based on the database type.
     *
     * This method adds appropriate quotes around the column name depending on the database type.
     * For PostgreSQL and SQLite, it uses double quotes. For other databases, it uses backticks.
     * If the column name is empty or null, it simply returns an empty string.
     *
     * @param string $dbType The type of the database (e.g., 'pgsql', 'sqlite', 'mysql').
     * @param string|null $column The name of the column to be quoted.
     * @return string The quoted column name or an empty string if the column is null or empty.
     */
    public static function quoteColumnName(string $dbType, ?string $column): string
    {
        if (empty($column)) {
            return '';
        }

        return ($dbType === 'pgsql' || $dbType === 'sqlite') ? "\"$column\"" : "`$column`";
    }

    /**
     * Parses a column string into an array of segments.
     *
     * This method performs the following steps:
     * 1. Replaces occurrences of '._.' with '._ARRAY_.' in the input string.
     * 2. Splits the modified string on '.' to create an array of parts.
     * 3. Converts '_ARRAY_' placeholders into special markers in the resulting array.
     *
     * @param string $column The column string to be parsed.
     * @return array An array of segments derived from the input column string.
     */
    public static function parseColumn(string $column): array
    {
        // Step 1: replace ._. with ._ARRAY_.
        $column = str_replace('._.', '._ARRAY_.', $column);

        // Step 2: split on '.'
        $parts = explode('.', $column);

        // Step 3: convert '_ARRAY_' placeholders into special markers in the array
        $segments = [];
        foreach ($parts as $part) {
            if ($part === '_ARRAY_') {
                $segments[] = '_ARRAY_';
            } else {
                $segments[] = $part;
            }
        }

        return $segments;
    }

    /**
     * Recursively builds SQL JOIN statements and SELECT fields for nested relations.
     *
     * @param array $include An array of relations to include, with optional nested includes.
     * @param string $parentAlias The alias of the parent table in the SQL query.
     * @param array &$joins An array to collect the generated JOIN statements.
     * @param array &$selectFields An array to collect the generated SELECT fields.
     * @param mixed $pdo The PDO instance for database connection.
     * @param string $dbType The type of the database (e.g., 'mysql', 'pgsql').
     * @param object|null $model The model object containing metadata about the relations.
     *
     * @throws \Exception If relation metadata is not defined or if required fields/references are missing.
     */
    public static function buildJoinsRecursively(
        array $include,
        string $parentAlias,
        array &$joins,
        array &$selectFields,
        mixed $pdo,
        string $dbType,
        ?object $model = null,
        string $defaultJoinType = 'INNER JOIN' // Default join type
    ) {
        foreach ($include as $relationName => $relationOptions) {

            $joinType = isset($relationOptions['join.type'])
                ? strtoupper($relationOptions['join.type']) . ' JOIN'
                : $defaultJoinType;

            if (!in_array($joinType, ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN'], true)) {
                throw new \Exception("Invalid join type: $joinType (expected 'INNER JOIN', 'LEFT JOIN', or 'RIGHT JOIN')");
            }
            // Check for nested includes (like ['include' => [ ... ]])
            $nestedInclude = [];
            if (is_array($relationOptions) && isset($relationOptions['include']) && is_array($relationOptions['include'])) {
                $nestedInclude = $relationOptions['include'];
            }
            $isNested = !empty($nestedInclude);

            // 1. Fetch metadata
            if (!isset($model->fields[$relationName]['decorators'])) {
                throw new \Exception(
                    "Relation metadata not defined for '$relationName' in " . get_class($model)
                );
            }
            $decorator = $model->fields[$relationName]['decorators'];

            // 2. Determine the actual DB table
            $joinTable = $decorator['relation']['relationTableName']
                ?? $decorator['inverseRelation']['toTableName']
                ?? $decorator['implicitRelation']['tableName']
                ?? null;
            if (!$joinTable) {
                throw new \Exception("No valid table name found for relation '$relationName'.");
            }

            // 3. Figure out the relation type in one place
            $relationType = $decorator['relation']['type']
                ?? $decorator['inverseRelation']['type']
                ?? $decorator['implicitRelation']['type']
                ?? null;
            // Decide the alias separator: OneToOne/ManyToOne => '.', else '._.'
            $separator = ($relationType === 'OneToOne' || $relationType === 'ManyToOne')
                ? '.'
                : '._.';

            $newAliasQuoted = PPHPUtility::quoteColumnName($dbType, $relationName);

            // 4. Build the ON condition
            $joinCondition = '';
            if (isset($decorator['relation'])) {
                $relationField = $decorator['relation']['references'][0] ?? null;
                $referenceKey  = $decorator['relation']['fields'][0]    ?? null;

                if (!$relationField || !$referenceKey) {
                    throw new \Exception("Missing 'references' or 'fields' for relation '$relationName'.");
                }

                // The join pattern is the same whether OneToOne, ManyToOne, etc.
                $joinCondition = sprintf(
                    '%s.%s = %s.%s',
                    $parentAlias,
                    PPHPUtility::quoteColumnName($dbType, $referenceKey),
                    $newAliasQuoted,
                    PPHPUtility::quoteColumnName($dbType, $relationField)
                );
            } elseif (isset($decorator['inverseRelation'])) {
                $relationField = $decorator['inverseRelation']['fields'][0] ?? null;
                $referenceKey  = $decorator['inverseRelation']['references'][0] ?? null;

                if (!$relationField || !$referenceKey) {
                    throw new \Exception("Missing 'fields' or 'references' for inverseRelation '$relationName'.");
                }

                $joinCondition = sprintf(
                    '%s.%s = %s.%s',
                    $parentAlias,
                    PPHPUtility::quoteColumnName($dbType, $referenceKey),
                    $newAliasQuoted,
                    PPHPUtility::quoteColumnName($dbType, $relationField)
                );
            } elseif (isset($decorator['implicitRelation'])) {
                $relationField = $decorator['implicitRelation']['fields'][0] ?? null;
                $referenceKey  = $decorator['implicitRelation']['references'][0] ?? null;

                if (!$relationField || !$referenceKey) {
                    throw new \Exception("Missing 'fields' or 'references' for implicitRelation '$relationName'.");
                }

                $joinCondition = sprintf(
                    '%s.%s = %s.%s',
                    $parentAlias,
                    PPHPUtility::quoteColumnName($dbType, $referenceKey),
                    $newAliasQuoted,
                    PPHPUtility::quoteColumnName($dbType, $relationField)
                );
            } else {
                throw new \Exception("Relation or inverseRelation not properly defined for '$relationName'.");
            }

            // 5. Add the JOIN statement dynamically
            $joinTableQuoted = PPHPUtility::quoteColumnName($dbType, $joinTable);
            $joins[] = sprintf(
                '%s %s AS %s ON %s',
                $joinType,
                $joinTableQuoted,
                $newAliasQuoted,
                $joinCondition
            );

            // 6. Identify the related class
            $relatedClass = PPHPFactory::getRelatedClass($relationName, $pdo) ?? null;
            if (!$relatedClass) {
                throw new \Exception("Could not instantiate class for relation '$relationName'.");
            }

            // 7. Add columns from the joined table
            $fieldsOnly = $relatedClass->fieldsOnly ?? [];
            foreach ($fieldsOnly as $field) {
                $quotedField       = PPHPUtility::quoteColumnName($dbType, $field);
                $columnAlias       = sprintf('%s%s%s', $relationName, $separator, $field);
                $columnAliasQuoted = PPHPUtility::quoteColumnName($dbType, $columnAlias);
                $selectFields[] = sprintf(
                    '%s.%s AS %s',
                    $newAliasQuoted,
                    $quotedField,
                    $columnAliasQuoted
                );
            }

            // 8. Recurse for nested includes
            if ($isNested) {
                self::buildJoinsRecursively(
                    $nestedInclude,
                    $newAliasQuoted,
                    $joins,
                    $selectFields,
                    $pdo,
                    $dbType,
                    $relatedClass
                );
            }
        }
    }
}
