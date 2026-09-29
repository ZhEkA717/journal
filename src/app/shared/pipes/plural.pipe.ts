import { Pipe, type PipeTransform } from '@angular/core';

const DEFAULT_FORMS: readonly string[] = ['', '', ''];

/**
 * Русское склонение числительных: «1 запись», «2 записи», «5 записей».
 * Формы передаются аргументами или одним массивом из трёх элементов.
 */
@Pipe({ name: 'plural' })
export class PluralPipe implements PipeTransform {
  transform(count: number, one: string | readonly string[], few?: string, many?: string): string {
    const forms = this.resolveForms(one, few, many);
    const abs = Math.abs(count);
    const mod10 = abs % 10;
    const mod100 = abs % 100;
    if (mod10 === 1 && mod100 !== 11) {
      return forms[0];
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      return forms[1];
    }
    return forms[2];
  }

  private resolveForms(
    one: string | readonly string[],
    few?: string,
    many?: string,
  ): readonly string[] {
    if (typeof one !== 'string') {
      return one.length > 0 ? one : DEFAULT_FORMS;
    }
    return [one, few ?? one, many ?? one];
  }
}
