<?php

namespace Lib\Prisma\Classes;

enum ArrayType: string
{
    case Associative = 'associative';
    case Indexed = 'indexed';
    case Value = 'value';
}

abstract class Utility
{
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
                if ($key === $timestamp) {
                    continue;
                }

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
                        $fieldName = trim($fieldName);

                        if (!array_key_exists($fieldName, $fields)) {
                            throw new \Exception("The field '$fieldName' does not exist in the $modelName model.");
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

    public static function checkFieldsExist(array $select, array $fields, string $modelName)
    {
        foreach ($select as $key => $value) {
            if (is_numeric($key) && is_string($value)) {
                if (array_key_exists($value, $fields))
                    throw new \Exception("The '$value' is indexed, waiting example: ['$value' => true]");
            }

            if (isset($value) && empty($value) || !is_bool($value)) {
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

    public static function checkArrayContents(array $array)
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

    public static function checkIncludes(array $include, array &$relatedEntityFields, array &$includes)
    {
        if (isset($include) && is_array($include)) {
            foreach ($include as $key => $value) {
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

                if (is_numeric($key) && is_string($value)) {
                    throw new \Exception("The '$value' is indexed, waiting example: ['$value' => true]");
                }

                if (isset($value) && empty($value) || !is_bool($value)) {
                    continue;
                }

                $includes[$key] = $value;
            }
        }
    }
}
